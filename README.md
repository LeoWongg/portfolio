# Personal Portfolio

DSC 106 Lab 4. Built with HTML, CSS, and JavaScript modules.

The Projects page loads all 12 entries from `lib/projects.json` and computes the heading count. The homepage displays the first three entries and fetches public profile stats for `LeoWongg` from the GitHub API. Both pages share `fetchJSON` and `renderProjects` in `global.js`.

Entries marked Placeholder are sample data permitted by the lab, not claims of completed work. Their years are example values. Existing GitHub repositories are referenced only; they are not modified by this site.

Run from a local HTTP server, such as VS Code Live Server. JavaScript modules and Fetch require HTTP rather than opening `index.html` as a file.

GitHub Pages serves the root of the `main` branch. Relative module and image paths support the repository subdirectory.

The Lab 4 submission requires the repository link, website link, and an MP4 screen recording of at most one minute. Record your own narration while showing the website and its JavaScript features. Share the most interesting thing you learned and answer one Think About It question from the lab. No course submission has been made.

One question to discuss: why clear the container before rendering? Clearing removes the old cards so calling the rendering function again replaces them instead of creating duplicates.
