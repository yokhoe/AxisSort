# UI Flows

## Sorting Photos (Photo Stack)

1.  The user is presented with a **Photo Stack**.
2.  **Tinder Mode**: Swipe **Left** or **Right** (or use Arrow keys) to sort.
3.  **Tinder Plus Mode**: Adds **Up** and **Down** sorting directions.
4.  **Visual Feedback**: An overlay indicates the destination (e.g., "Send to KEEP") as the photo is dragged.
5.  **Trash**: Click the trash icon in the header or press `Backspace`/`T` to move the photo to the trash destination.

## Inspecting Metadata

1.  Click or tap on a photo in the stack.
2.  The photo expands smoothly into a **Metadata Drawer** (shared-element transition).
3.  The user can view file properties (Dimensions, Size, Path) and EXIF data.
4.  Long text (like paths) wraps automatically for full visibility.
5.  Click **Close** or the background to return to sorting.

## Configuring the App

1.  Click the **Gear Icon** in the header.
2.  Review current directories, active mode (Tinder vs. Tinder Plus), and safety status (Dry Run).
3.  Settings are currently managed via the `.env` file and reflected in this menu.
