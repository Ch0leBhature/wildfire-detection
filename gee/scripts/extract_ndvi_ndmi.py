"""
Extract NDVI and NDMI from Sentinel-2 using Google Earth Engine.

Processes Sentinel-2 SR imagery for a grid of cells, computes vegetation
indices (NDVI, NDMI), creates monthly composites, and reduces values
over each grid cell.

Prerequisites:
    pip install earthengine-api
    earthengine authenticate

Usage:
    python gee/scripts/extract_ndvi_ndmi.py --year 2023 --region california
    python gee/scripts/extract_ndvi_ndmi.py --start-year 2019 --end-year 2023

Output:
    gee/exports/ndvi_ndmi_{year}_{month}.csv
    Columns: grid_id, year, month, ndvi_mean, ndvi_median, ndmi_mean, ndmi_median
"""
import ee
import argparse
import csv
import os
import sys

# Grid cell size in degrees (approximately 5km at mid-latitudes)
CELL_SIZE_DEG = 0.045

# California bounding box
CA_BBOX = [-124.5, 32.5, -114.0, 42.0]


def initialize_ee():
    """Initialize Earth Engine with authentication."""
    try:
        ee.Initialize(project='your-gee-project-id')
        print("Earth Engine initialized successfully.")
    except Exception as e:
        print(f"Earth Engine initialization failed: {e}")
        print("\nTo set up Earth Engine:")
        print("  1. pip install earthengine-api")
        print("  2. earthengine authenticate")
        print("  3. Replace 'your-gee-project-id' with your GEE project ID")
        sys.exit(1)


def cloud_mask_s2(image):
    """Apply cloud masking to Sentinel-2 SR image using SCL band."""
    scl = image.select('SCL')
    # SCL classes: 4=vegetation, 5=bare soil, 6=water, 7=cloud low prob
    # Exclude: 1=saturated, 3=cloud shadow, 8=cloud med, 9=cloud high, 10=cirrus, 11=snow
    mask = scl.neq(1).And(scl.neq(3)).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
    return image.updateMask(mask)


def compute_indices(image):
    """Compute NDVI and NDMI from Sentinel-2 bands."""
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('ndvi')
    ndmi = image.normalizedDifference(['B8', 'B11']).rename('ndmi')
    return image.addBands([ndvi, ndmi])


def create_grid(bbox, cell_size_deg):
    """Create a grid of rectangular cells over the bounding box."""
    west, south, east, north = bbox
    cells = []
    cell_id = 0
    lat = south
    while lat < north:
        lng = west
        while lng < east:
            cell = ee.Geometry.Rectangle([lng, lat, lng + cell_size_deg, lat + cell_size_deg])
            cells.append({'id': cell_id, 'geometry': cell, 'lat': lat + cell_size_deg / 2, 'lng': lng + cell_size_deg / 2})
            cell_id += 1
            lng += cell_size_deg
        lat += cell_size_deg
    return cells


def extract_month(year, month, grid_cells, output_dir):
    """Extract NDVI/NDMI for one month across all grid cells."""
    start_date = f'{year}-{month:02d}-01'
    if month == 12:
        end_date = f'{year + 1}-01-01'
    else:
        end_date = f'{year}-{month + 1:02d}-01'

    # Filter Sentinel-2 SR collection
    collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate(start_date, end_date)
                  .filterBounds(ee.Geometry.Rectangle(CA_BBOX))
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                  .map(cloud_mask_s2)
                  .map(compute_indices))

    # Create median composite
    composite = collection.median()

    # Reduce over each grid cell
    output_file = os.path.join(output_dir, f'ndvi_ndmi_{year}_{month:02d}.csv')
    results = []

    for cell in grid_cells:
        try:
            stats = composite.select(['ndvi', 'ndmi']).reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.median(), sharedInputs=True),
                geometry=cell['geometry'],
                scale=10,
                maxPixels=1e8
            ).getInfo()

            results.append({
                'grid_id': cell['id'],
                'year': year,
                'month': month,
                'lat': cell['lat'],
                'lng': cell['lng'],
                'ndvi_mean': stats.get('ndvi_mean'),
                'ndvi_median': stats.get('ndvi_median'),
                'ndmi_mean': stats.get('ndmi_mean'),
                'ndmi_median': stats.get('ndmi_median')
            })
        except Exception as e:
            print(f"  Error for cell {cell['id']}: {e}")
            results.append({
                'grid_id': cell['id'], 'year': year, 'month': month,
                'lat': cell['lat'], 'lng': cell['lng'],
                'ndvi_mean': None, 'ndvi_median': None,
                'ndmi_mean': None, 'ndmi_median': None
            })

    # Write CSV
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    print(f"  Saved {len(results)} cells to {output_file}")
    return results


def main():
    parser = argparse.ArgumentParser(description='Extract NDVI/NDMI from Sentinel-2 via GEE')
    parser.add_argument('--start-year', type=int, default=2023)
    parser.add_argument('--end-year', type=int, default=2023)
    parser.add_argument('--months', type=str, default='1-12', help='Month range, e.g. "6-9"')
    parser.add_argument('--cell-size', type=float, default=CELL_SIZE_DEG, help='Cell size in degrees')
    args = parser.parse_args()

    initialize_ee()

    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'exports')
    os.makedirs(output_dir, exist_ok=True)

    # Parse month range
    month_parts = args.months.split('-')
    start_month = int(month_parts[0])
    end_month = int(month_parts[1]) if len(month_parts) > 1 else start_month

    # Create grid
    print(f"Creating grid with cell size {args.cell_size}°...")
    grid_cells = create_grid(CA_BBOX, args.cell_size)
    print(f"Grid contains {len(grid_cells)} cells")

    # Extract for each year/month
    for year in range(args.start_year, args.end_year + 1):
        for month in range(start_month, end_month + 1):
            print(f"Processing {year}-{month:02d}...")
            extract_month(year, month, grid_cells, output_dir)

    print("\nExtraction complete!")


if __name__ == '__main__':
    main()
