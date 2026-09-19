"""
Extract land cover classes from ESA WorldCover using Google Earth Engine.

Computes the dominant land cover class for each grid cell using the
ESA WorldCover 10m land cover dataset.

ESA WorldCover classes → simplified mapping:
    10 (Tree cover)       → 1 (forest)
    20 (Shrubland)        → 2 (shrubland)
    30 (Grassland)        → 3 (grassland)
    40 (Cropland)         → 4 (cropland)
    50 (Built-up)         → 5 (urban)
    60 (Bare/sparse)      → 6 (barren)
    80 (Permanent water)  → 0 (water)
    90 (Herbaceous wetland) → 3 (grassland)
    95 (Mangroves)        → 1 (forest)
    100 (Moss and lichen) → 6 (barren)

Prerequisites:
    pip install earthengine-api
    earthengine authenticate

Usage:
    python gee/scripts/extract_landcover.py

Output:
    gee/exports/landcover_features.csv
    Columns: grid_id, lat, lng, land_cover, land_cover_name
"""
import ee
import csv
import os
import sys

CELL_SIZE_DEG = 0.045
CA_BBOX = [-124.5, 32.5, -114.0, 42.0]

# ESA WorldCover to simplified mapping
ESA_TO_SIMPLE = {
    10: 1,   # Tree cover → forest
    20: 2,   # Shrubland → shrubland
    30: 3,   # Grassland → grassland
    40: 4,   # Cropland → cropland
    50: 5,   # Built-up → urban
    60: 6,   # Bare/sparse → barren
    70: 0,   # Snow and ice → water (simplified)
    80: 0,   # Permanent water → water
    90: 3,   # Herbaceous wetland → grassland
    95: 1,   # Mangroves → forest
    100: 6,  # Moss and lichen → barren
}

SIMPLE_NAMES = {0: 'water', 1: 'forest', 2: 'shrubland', 3: 'grassland',
                4: 'cropland', 5: 'urban', 6: 'barren'}


def initialize_ee():
    try:
        ee.Initialize(project='your-gee-project-id')
        print("Earth Engine initialized.")
    except Exception as e:
        print(f"Earth Engine initialization failed: {e}")
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

    # ESA WorldCover 2021
    landcover = ee.ImageCollection('ESA/WorldCover/v200').first().select('Map')

    print(f"Creating grid ({CELL_SIZE_DEG}° cells)...")
    grid_cells = create_grid(CA_BBOX, CELL_SIZE_DEG)
    print(f"Processing {len(grid_cells)} cells...")

    results = []
    for i, cell in enumerate(grid_cells):
        if i % 500 == 0:
            print(f"  Processing cell {i}/{len(grid_cells)}...")
        try:
            # Get mode (most common class) within the cell
            stats = landcover.reduceRegion(
                reducer=ee.Reducer.mode(),
                geometry=cell['geometry'],
                scale=10,
                maxPixels=1e8
            ).getInfo()

            esa_class = int(stats.get('Map', 0))
            simple_class = ESA_TO_SIMPLE.get(esa_class, 6)
            simple_name = SIMPLE_NAMES.get(simple_class, 'barren')

            results.append({
                'grid_id': cell['id'],
                'lat': cell['lat'],
                'lng': cell['lng'],
                'esa_class': esa_class,
                'land_cover': simple_class,
                'land_cover_name': simple_name
            })
        except Exception as e:
            print(f"  Error for cell {cell['id']}: {e}")
            results.append({
                'grid_id': cell['id'], 'lat': cell['lat'], 'lng': cell['lng'],
                'esa_class': None, 'land_cover': 6, 'land_cover_name': 'barren'
            })

    output_file = os.path.join(output_dir, 'landcover_features.csv')
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    print(f"\nSaved {len(results)} cells to {output_file}")
    print("Land cover extraction complete!")


if __name__ == '__main__':
    main()
