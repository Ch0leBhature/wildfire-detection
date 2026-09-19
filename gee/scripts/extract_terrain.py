"""
Extract elevation and slope from SRTM DEM using Google Earth Engine.

Computes mean elevation and slope for each grid cell using the
USGS SRTM 30m DEM dataset.

Prerequisites:
    pip install earthengine-api
    earthengine authenticate

Usage:
    python gee/scripts/extract_terrain.py

Output:
    gee/exports/terrain_features.csv
    Columns: grid_id, lat, lng, elevation_mean, slope_mean
"""
import ee
import csv
import os
import sys

# Grid cell size in degrees (~5km at mid-latitudes)
CELL_SIZE_DEG = 0.045
CA_BBOX = [-124.5, 32.5, -114.0, 42.0]


def initialize_ee():
    try:
        ee.Initialize(project='your-gee-project-id')
        print("Earth Engine initialized.")
    except Exception as e:
        print(f"Earth Engine initialization failed: {e}")
        print("Run: earthengine authenticate")
        sys.exit(1)


def create_grid(bbox, cell_size_deg):
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


def main():
    initialize_ee()

    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'exports')
    os.makedirs(output_dir, exist_ok=True)

    # Load SRTM DEM
    dem = ee.Image('USGS/SRTMGL1_003')
    elevation = dem.select('elevation')
    slope = ee.Terrain.slope(dem)

    terrain = elevation.addBands(slope)

    # Create grid
    print(f"Creating grid ({CELL_SIZE_DEG}° cells)...")
    grid_cells = create_grid(CA_BBOX, CELL_SIZE_DEG)
    print(f"Processing {len(grid_cells)} cells...")

    results = []
    for i, cell in enumerate(grid_cells):
        if i % 500 == 0:
            print(f"  Processing cell {i}/{len(grid_cells)}...")
        try:
            stats = terrain.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=cell['geometry'],
                scale=30,
                maxPixels=1e8
            ).getInfo()

            results.append({
                'grid_id': cell['id'],
                'lat': cell['lat'],
                'lng': cell['lng'],
                'elevation_mean': stats.get('elevation'),
                'slope_mean': stats.get('slope')
            })
        except Exception as e:
            print(f"  Error for cell {cell['id']}: {e}")
            results.append({
                'grid_id': cell['id'], 'lat': cell['lat'], 'lng': cell['lng'],
                'elevation_mean': None, 'slope_mean': None
            })

    # Write CSV
    output_file = os.path.join(output_dir, 'terrain_features.csv')
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    print(f"\nSaved {len(results)} cells to {output_file}")
    print("Terrain extraction complete!")


if __name__ == '__main__':
    main()
