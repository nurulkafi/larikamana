# LariKamana 🏃‍♂️💨
*A smart, lightweight running route planner web app built with Next.js, Leaflet, and OpenStreetMap / Google Maps layers.*

---

## ✨ Features

- 🗺️ **Interactive Route Planning**: Click anywhere on the map to add waypoints, drag to adjust, or finish a loop.
- 🚶 **Smart Pedestrian Routing**: Powered by OSRM foot routing with intelligent detour bypass (allowing runners to safely navigate through pedestrian-friendly paths and avoid unnecessary vehicle one-way detours).
- 🔄 **Quick Loop & Finish**: Start point includes a direct finish button to easily close your loop.
- 📐 **Real-time Route Metrics**: Instant calculation of total distance (km), estimated duration, pace (min/km), and elevation gain (m).
- ⛰️ **Elevation Profile**: Interactive elevation chart visualising hills and elevation changes along the route using Open-Elevation API.
- 🗺️ **Multiple Map Providers**:
  - Google Maps (Roadmap & Satellite Hybrid)
  - OpenStreetMap Standard & Humanitarian
  - Esri World Imagery (Satellite)
  - CartoDB Positron & Dark
- 🔍 **Location Search**: Search places and addresses worldwide using Nominatim / OpenStreetMap.
- 💾 **Save & Manage Routes**: Save routes to local storage for quick access anytime.
- 📤 **GPX Export**: Export planned routes directly to GPX format for Garmin, Strava, Coros, Suunto, Apple Watch, or other GPS devices.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Mapping**: [Leaflet](https://leafletjs.com/) via `react-leaflet` & dynamic SSR handling
- **Routing Engine**: [OSRM](http://project-osrm.org/) (Foot profile)
- **Geocoding**: [Nominatim OpenStreetMap](https://nominatim.openstreetmap.org/)
- **Elevation Data**: [Open-Elevation API](https://open-elevation.com/)
- **Icons**: Lucide React

---

## 🛠️ Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start planning routes.

### Production Build

```bash
npm run build
npm run start
```

---

## 📄 License

MIT
