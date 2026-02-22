# Hacklytics-2026
![alt text](image-2.png)

**Track B — City-Wide Mapping:** Generate a comprehensive parking map for a city or metro area, identifying and counting parking across the entire geography. Think: "Show me every surface parking lot in Atlanta and how many spots each has."

Track B is more ambitious and will be weighted favorably in judging — but a highly accurate Track A submission beats a sloppy city-wide map. Quality over quantity.

![alt text](image.png)

## Suggested Data Sources

Sourcing and combining data is part of the challenge. Here are starting points:

- **ParkSeg12k** — 12,617 satellite image/mask pairs covering ~35,000 parking lots across 45 US cities (RGB + NIR channels available). [GitHub: UTEL-UIUC/ParkSeg12k](https://github.com/UTEL-UIUC/ParkSeg12k)
- **SpaceNet** — High-resolution satellite imagery competitions with building/road annotations that provide useful context. [spacenet.ai](https://spacenet.ai/)
- **APKLOT** — ~7,000 annotated polygons for aerial parking block segmentation from global cities. [GitHub: langheran/APKLOT](https://github.com/langheran/APKLOT)
- **Grab-Pklot** — 1,344 context-enriched satellite images with parking lot annotations from Singapore. [WACV 2022 paper](https://openaccess.thecvf.com/content/WACV2022/html/Yin_A_Context-Enriched_Satellite_Imagery_Dataset_and_an_Approach_for_Parking_WACV_2022_paper.html)
- **Google Maps Static API / Google Earth Engine** — For pulling satellite tiles of specific locations
- **OpenStreetMap** — Parking lot polygons and metadata as weak labels or validation data
- **NAIP (National Agriculture Imagery Program)** — Free high-res US aerial imagery via USGS

Teams are encouraged to combine multiple sources and get creative with data augmentation, transfer learning, or using auxiliary signals (road networks, building footprints, zoning data) to improve results.

## Things to Consider

Parking isn't just surface lots. In urban environments like Atlanta, a huge share of parking capacity is hidden from the satellite view:

- **Parking garages / structures** — Multi-level garages are invisible from above. Can you detect their footprint and estimate capacity using building height data, municipal records, or other signals? Teams that account for structured parking will stand out.
- **Street parking** — On-street spots are everywhere but hard to count from imagery alone. Can you estimate street parking by analyzing road widths, curb lengths, and restriction zones? Combining satellite data with OpenStreetMap road networks or Google Street View could be powerful here.
- **Parking restrictions** — Not all visible pavement is a legal parking spot. Fire lanes, loading zones, handicap-only, time-limited meters, residential permit zones — identifying restrictions adds real-world value. Municipal open data or street-level imagery could help.

You don't have to solve all of these, but acknowledging and attempting to handle these edge cases shows maturity in your approach.

## Suggested Approaches

These are suggestions, not requirements — surprise us:

- **Semantic segmentation** to detect parking lot boundaries, then estimate spot count by area + standard spot dimensions
- **Object detection** (YOLO, Faster R-CNN) to directly count individual vehicles or spot markings
- **Multi-stage pipelines** — coarse lot detection from low-res imagery, then fine-grained spot counting from high-res tiles
- **Hybrid approaches** — combine satellite detection with OpenStreetMap metadata, Google Places API parking data, or municipal open data for validation

## Rules & Submission

- *Include a clear evaluation section showing your accuracy metrics on at least 2 distinct geographic areas*

Finding a parking spot shouldn't be a guessing game. **SnapPark** tackles the ambitious Track B challenge by generating comprehensive parking insights across urban geographies. By combining an intuitive, dark-themed user interface with a powerful YOLOv8 computer vision pipeline, we've built a scalable ecosystem designed to map and count surface parking lots across city-wide grids in Atlanta.

---------------------------------------------------------------------------------------------------------------------------------------------------

## 🎯 What We Built

At the core of SnapPark is our **Image Processing Engine powered by YOLOv8**. Users simply upload an image, and the system generates a side-by-side comparison. The processed image automatically identifies, bounds, and masks the available spaces that are not taken up by a car.

### 🔍 Core Features & Navigation
* **Home:** The main dashboard featuring a seamless, drag-and-drop image upload portal.
* **Live Demo:** Don't have an image on hand? Test the system immediately using pre-loaded sample parking lot images to see the before/after results and spot counts in action.
* **How It Works:** A technical breakdown page detailing the system architecture, explaining our approach to image segmentation, masking, and object detection.
* **History:** A personalized log of your previously scanned lots. Keep track of past images, historical spot counts, and timestamped entries.
* **API:** Comprehensive documentation for developers detailing how to integrate with our detection endpoints to send images and receive spot coordinates.
* **Model Lab:** A backend-style view displaying the health of our detection model, including accuracy metrics, dataset sizes, and performance analytics.
* **Ask Chat:** An integrated AI chat assistant where users can ask contextual questions about the platform, detection logic, or parking analytics.

---

## 🧠 Technical Approach & Data Fusion

To tackle the complexities of city-wide mapping, we implemented a robust object detection pipeline. 

* **Model Architecture:** We utilized **YOLOv8** for direct object detection, optimizing it to identify individual vehicles and bound empty surface spots from aerial and context-enriched imagery.
* **UI & Frontend Prototype:** Rapidly prototyped and generated using **Figma Make**, styled with **Tailwind CSS** to ensure a polished, production-ready dark mode aesthetic.
* **Data Sources Utilized:** *(Note: Update these with the exact datasets your team used)*
  * **A Pipeline and NIR-Enhanced Dataset for Parking Lot Segmentation | url:{https://arxiv.org/pdf/2412.13179%7D}:** Leveraged for robust satellite image/mask pairs, pulled specific satellite tiles for testing.