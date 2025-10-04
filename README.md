# Interactive Earth Story Map

A dynamic web application for visualizing and exploring climate-related events across the globe using satellite data.

![Interactive Earth Story Map](https://via.placeholder.com/800x400?text=Interactive+Earth+Story+Map)

## 🌍 Features

- **Interactive World Map**: Click on hotspots to explore climate events
- **Timeline Navigation**: Browse events chronologically with intuitive controls
- **Story Mode**: Guided storytelling experience with automatic progression
- **Advanced Filtering**: Filter events by type, severity, region, and date
- **Real-time Notifications**: Get updates on new events and system status
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support

## 🛰️ Event Types

- **🔥 Wildfires**: Forest fires detected via satellite imagery
- **💨 Air Pollution**: CO and other atmospheric pollutants
- **🌊 Flooding**: River and coastal flooding events
- **🌪️ Storms**: Severe weather and storm systems
- **🌡️ Temperature**: Extreme heat and cold events
- **🌱 Vegetation**: Deforestation and land use changes

## 🚀 Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   ```

2. **Start a local server** (required for ES6 modules):
   ```bash
   # Using Python 3
   python -m http.server 3000
   
   # Using Node.js
   npx http-server -p 3000
   
   # Using PHP
   php -S localhost:3000
   ```

3. **Open in browser**:
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
├── index.html              # Main HTML structure
├── styles.css              # Complete CSS styling
├── main.js                 # Application entry point
├── store.js                # State management (Pub/Sub)
├── timeline.js             # Timeline component
├── map.js                  # Interactive map component  
├── story.js                # Story mode functionality
├── filters.js              # Event filtering system
├── notifications.js        # Notification system
├── utils.js                # Utility functions
├── sampleData.js           # Sample event data
├── events.mock.json        # Mock API data
├── PROJECT_OVERVIEW.md     # Detailed documentation
└── README.md               # This file
```

## 🎮 Usage

### Basic Navigation
- **Click hotspots** on the map to view event details
- **Use timeline** at the bottom to browse events chronologically
- **Apply filters** at the top to narrow down events

### Story Mode
- Click **"Start Story"** to begin guided experience
- Use **play/pause** controls to manage playback
- Navigate with **previous/next** buttons

### Keyboard Shortcuts
- `Space`: Play/Pause story mode
- `←/→`: Previous/Next event
- `Esc`: Exit story mode
- `Tab`: Navigate interface elements

## 🛠️ Technical Details

- **Pure JavaScript ES6**: No external dependencies
- **Modular Architecture**: Clean separation of concerns
- **Pub/Sub Pattern**: Centralized state management
- **Responsive CSS Grid**: Modern layout techniques
- **Web Standards**: Semantic HTML and ARIA accessibility

## 📊 Data Format

Events follow this structure:
```javascript
{
  "id": "unique_event_id",
  "type": "fire|co_pollution|flood|storm|temperature|vegetation",
  "title": "Event Title",
  "summary": "Brief description",
  "location": {
    "name": "Location Name",
    "coordinates": { "lat": 0.0, "lng": 0.0 },
    "mapPosition": { "xPercent": 50, "yPercent": 50 }
  },
  "severity": "low|medium|high",
  "date": "ISO 8601 timestamp",
  "confidence": 0-100,
  "metadata": { /* Additional event-specific data */ }
}
```

## 🔧 Development

### Adding New Event Types
1. Update `EVENT_TYPES` in `store.js`
2. Add corresponding styles in `styles.css`
3. Update filter options in `filters.js`

### Customizing Appearance
- Modify CSS custom properties in `:root` selector
- Update `styles.css` for component-specific styling
- Adjust map positioning in event data

## 🌐 Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Modern mobile browsers

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📬 Contact

For questions or suggestions, please open an issue on GitHub.

---

**Built with ❤️ for climate awareness and education**