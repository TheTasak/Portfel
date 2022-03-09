<!DOCTYPE HTML>
<html>
  <head>
    <meta charset="utf-8">
    <meta content="width=device-width, initial-scale=1.0" name="viewport" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.1/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.1/dist/js/bootstrap.bundle.min.js" defer></script>

    <script src="circlechart.js" defer></script>
    <script src="script.js" defer></script>
    <script src="https://d3js.org/d3.v6.js" defer></script>
    <script src="https://cdn.jsdelivr.net/npm/d3-dsv@3"></script>
    <style>
      #container{
        height: 500px;
        width: 100%;
      }
      body{
        margin: 0 auto;
      }
    </style>
  </head>
  <body id="body">
    <main>
      <div class="mb-3">
          <input type="file" accept=".csv" id="filecontent" disabled>
      </div>
      <div class="mb-3">
          <button class="btn btn-primary mb-3" type="submit" onclick="readFile()">Wyślij</button>
      </div>
      <div id="container">
      </div>
      <div id="transakcje">
      </div>
    </main>
  </body>
</html>
