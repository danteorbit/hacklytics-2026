import cv2
import numpy as np

def highlight_parking_areas(original_image_path, segmented_image_path):
    """
    Identifies white areas and draws ACTUAL outlines to follow 
    complex shapes, then labels them at their center of mass.
    """
    # 1. Load the images
    original = cv2.imread(original_image_path)
    segmented = cv2.imread(segmented_image_path, cv2.IMREAD_GRAYSCALE)

    if original is None or segmented is None:
        # We return a tuple even on error so the 'unpacking' doesn't fail
        return None, "Error: Could not load one or both images."

    # 2. Threshold the segmented image to ensure it's binary
    _, binary = cv2.threshold(segmented, 127, 255, cv2.THRESH_BINARY)

    # 3. Find contours of the white regions
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    output_image = original.copy()
    centers_and_labels = []
    label_char_code = ord('A')

    # 4. Process each found contour
    for contour in contours:
        # Filter out very small noise
        if cv2.contourArea(contour) < 100: 
            continue

        # Contour Approximation for a smoother outline
        epsilon = 0.005 * cv2.arcLength(contour, True)
        approx_contour = cv2.approxPolyDP(contour, epsilon, True)

        # Calculate the center of mass using Moments
        M = cv2.moments(approx_contour)
        if M["m00"] != 0:
            center_x = int(M["m10"] / M["m00"])
            center_y = int(M["m01"] / M["m00"])
        else:
            center_x, center_y = approx_contour[0][0][0], approx_contour[0][0][1]
        
        center = (center_x, center_y)
        label = chr(label_char_code)
        centers_and_labels.append((label, center))
        label_char_code += 1

        # 5. Draw the ACTUAL outline
        cv2.drawContours(output_image, [approx_contour], -1, (0, 0, 255), 2)

        # Put the label text at the center
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 1.2
        font_thickness = 3
        text_size, _ = cv2.getTextSize(label, font, font_scale, font_thickness)
        text_x = center_x - text_size[0] // 2
        text_y = center_y + text_size[1] // 2
        
        cv2.putText(output_image, label, (text_x, text_y), font, font_scale, (0, 0, 255), font_thickness)

    # --- THE FIX: Return the results to the caller ---
    return output_image, centers_and_labels

# --- Example Usage ---
# Make sure these filenames match the files in your folder!
original_path = 'image_original.png' 
segmented_path = 'image_segmented.png'

result_img, centers = highlight_parking_areas(original_path, segmented_path)

if result_img is not None:
    print("Centers identified:")
    for label, center in centers:
        print(f"Area {label}: {center}")
    cv2.imwrite('output_precise_parking.png', result_img)
    print("\nSuccess! Saved to 'output_precise_parking.png'")
else:
    print(centers) # This will print the error message if images didn't load


