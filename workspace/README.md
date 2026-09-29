# Workspace types

The folder layout IS the registry: category folder, then type folder.

    workspaces/
      index.json                     categories -> type folders
      Document Workspace/            category (folder name = category name)
        Workspace_1/                 type (folder name = type name)
          index.html                 entry file
          workspace.json             optional
      _template/                     copy a type folder out of here (ignored)

The shell hardcodes no category and no type.

## Add a type
1. Copy `_template/Workspace_2` into a category folder (make a new category folder any time), rename it.
2. Put your files in it. Entry can be .html, .pdf, .svg, image, .txt.
3. Add it to `index.json`:  "Document Workspace": ["Workspace_1", "Workspace_2"]
   (On a local server this step is automatic.)

## workspace.json (optional)
- `name`: label shown (default: folder name)
- `entry`: file to open (default: index.html)
- `aliases`: old type ids this folder should still answer to

## Replace a type
Overwrite files inside its folder; keep the folder name.

## Delete a type / category
Delete the folder. It vanishes from the picker; nothing else is affected. Existing workspaces from it show "Missing type" until it returns.

## Safety
Each type runs in its own frame. Missing folders, wrong entry names or bad JSON are skipped silently. Type id = "Category/Type"; renaming a folder detaches existing workspaces unless you list the old id in `aliases`.
