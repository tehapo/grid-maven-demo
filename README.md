Grid Maven Demo
===============

Simple example of using <v-grid> from Vaadin Components package to provide a search interface for search.maven.org API.

### Install dependencies

```bash
bower install
npm install
```

### Start the application

The application has a simple Node backend to proxy and cache requests to the search.maven.org API.

```bash
node server.js &
python -m SimpleHTTPServer &
open http://localhost:8000
```
