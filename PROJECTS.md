# Multi-project setup

The app loads all projects listed in `projects.csv`.

```csv
project_id
001
002
003
```

Each project has its own folder and `project.csv`:

```text
projects/
  001/
    project.csv
    image1.jpg
    image2.jpg
```

Use this project CSV format:

```csv
type,value
title,Nike Campaign
image,image1.jpg
image,image2.jpg
```

Images are compared only with other images in the same folder. All valid comparisons are then shuffled together into one participant session.

The sample project currently points to the repository's existing `/images` folder so the current six images continue to work. For future projects, put the images directly in the numbered folder and use simple filenames such as `image,image1.jpg`.

Global settings are stored in `settings.csv`. Leave `access_code` blank to allow any code, or add a value to require a specific code.
