# Hacklytics-2026

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