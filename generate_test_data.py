import json
import random
from datetime import datetime

# Generate test events for performance testing
def generate_test_events(count):
    events = []
    instruments = ['modis', 'viirs', 'landsat', 'sentinel']
    types = ['fire', 'temperature', 'precipitation', 'vegetation', 'ice']
    severities = ['low', 'medium', 'high', 'critical']
    
    for i in range(count):
        random_date = datetime(2024, random.randint(1, 12), random.randint(1, 28))
        random_lat = random.uniform(-80, 80)
        random_lng = random.uniform(-170, 170)
        
        events.append({
            'id': f'perf_test_2024_{i:03d}',
            'title': f'Performance Test Event {i + 1}',
            'timestamp': random_date.isoformat() + 'Z',
            'type': random.choice(types),
            'severity': random.choice(severities),
            'instrument': random.choice(instruments),
            'coordinates': {
                'lat': random_lat,
                'lng': random_lng,
                'bounds': {
                    'north': random_lat + 0.5,
                    'south': random_lat - 0.5,
                    'east': random_lng + 0.5,
                    'west': random_lng - 0.5
                }
            },
            'metadata': {
                'confidence': random.random(),
                'temperature': random.uniform(20, 70),
                'description': f'Test event {i + 1} for performance testing',
                'source': 'generated',
                'processing_time': datetime.now().isoformat() + 'Z'
            }
        })
    
    return events

# Generate 500 events for performance testing
test_data = {
    'schemaVersion': 1,
    'year': 2024,
    'events': generate_test_events(500)
}

with open('./data/events.2024-perf.json', 'w') as f:
    json.dump(test_data, f, indent=2)

print('Generated 500 test events for performance testing')