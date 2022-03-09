var reader = new FileReader();
var dividends = [];
var translated_transactions = [];
var stock_price_data = [];
var chart;
var file_input;

const current_year = 2021;
window.onload = load;
function load() {
  file_input = document.getElementById('filecontent');
  d3.csv("https://docs.google.com/spreadsheets/d/e/2PACX-1vRsSHWEIigID-wNUx-OtyJpfOQ0feIoRRg8mbUe36AMgMgamWrQ45gC-u0t4ADubVYgSTEE5xg4QYmw/pub?gid=0&single=true&output=csv").then(d => {
    file_input.disabled = false;
    stock_price_data = d;
  });
}
function readFile() {
  const file = file_input.files[0];
  reader.addEventListener("load", parseFile, false);
  if(file) {
    reader.readAsText(file, 'ISO-8859-2');
  }
}
function parseFile() {
  let div = document.getElementById("transakcje");
  div.innerHTML = "";
  const psv = d3.dsvFormat(";");
  const data = psv.parse(reader.result);
  //showTable(data);
  let transactions = data.filter(d => (d["tytuł operacji"] == "Rozliczenie transakcji kupna:" || d["tytuł operacji"] == "Rozliczenie transakcji sprzedaży:"));
  transactions.forEach((item, i) => {
    if(item["tytuł operacji"] == "Rozliczenie transakcji kupna:") {
      item["tytuł operacji"] = "K";
    } else if(item["tytuł operacji"] == "Rozliczenie transakcji sprzedaży:") {
      item["tytuł operacji"] = "S";
    }
    let splitStr = item["szczegóły"].split(" ");
    item.spolka = splitStr[0];
    item.ilosc = parseInt(splitStr[1]);
    item.aktualna_ilosc = parseInt(splitStr[1]);
    item.cena = parseFloat(splitStr[3]);
    item.kwota = item.kwota.replace(/[,]/g, '.');
    item.kwota = parseFloat(item.kwota);
    delete item["szczegóły"];
  });
  translated_transactions = [];
  transactions.forEach((item, i) => {
    let index = translated_transactions.findIndex((el) => el.data == item.data && el.spolka == item.spolka);
    if(index != -1) {
      translated_transactions[index].cena = (translated_transactions[index].cena*translated_transactions[index].ilosc + item.cena*item.ilosc)/(translated_transactions[index].ilosc+item.ilosc);
      translated_transactions[index].ilosc += item.ilosc;
      translated_transactions[index].aktualna_ilosc += item.aktualna_ilosc;
      translated_transactions[index].kwota = parseFloat(translated_transactions[index].kwota) + parseFloat(item.kwota);
    } else {
      translated_transactions.push(item);
    }
  });
  dividends = data.filter(d => d["tytuł operacji"].indexOf("Wypłata dywidendy") != -1);
  dividends.forEach((item, i) => {
    let splitStr = item["tytuł operacji"].split(" ");
    item.spolka = splitStr[2];
    if(item.spolka == "brutto") {
      item.spolka = splitStr[3];
    }
    item.kwota = item.kwota.replace(/[,]/g, '.');
    item.kwota = parseFloat(item.kwota);

    let data = new Date(item.data);
    let dividend_transactions = translated_transactions.filter(d => new Date(d.data) < new Date(item.data) && item.spolka == d.spolka);
    let sum = d3.sum(dividend_transactions, d => parseInt(d.ilosc));
    item.dividend_per_stock = item.kwota / sum;

    delete item["szczegóły"];
  });
  showDividendTable(dividends);
  showTransactionTable(translated_transactions);
  iterateTransactions(translated_transactions, dividends);
}
function iterateTransactions(data, div) {
  let transakcje = document.getElementById("transakcje");
  let stocks = d3.map(data, d => d.spolka);
  stocks = stocks.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });
  let stocksCountArray = [];
  for(let i = 0; i < stocks.length; i++) {
    stocksCountArray.push({spolka: stocks[i], cena: 0, akcje_posiadane: 0, akcje_sprzedane: 0, zysk: 0, dywidenda_zysk: 0, przeszla_ilosc: 0, przeszla_suma: 0});
  }
  let transactions_copy = JSON.parse(JSON.stringify(data)).reverse();
  stocksCountArray.forEach((item, i) => {
    let temp_sell = d3.filter(transactions_copy, d => d["tytuł operacji"] == 'S' && d.spolka == item.spolka);
    temp_sell.forEach((sold, i) => {
      for(let j = 0; j < transactions_copy.length; j++) {
        if(transactions_copy[j]["tytuł operacji"] == 'K' && sold.spolka == transactions_copy[j].spolka && transactions_copy[j].aktualna_ilosc > 0) {
          if(transactions_copy[j].aktualna_ilosc >= sold.aktualna_ilosc) {
            transactions_copy[j].aktualna_ilosc -= sold.aktualna_ilosc;
            break;
          } else {
            transactions_copy[j].aktualna_ilosc = 0;
            sold.aktualna_ilosc -= transactions_copy[j].aktualna_ilosc;
            continue;
          }
        }
      }
    });
  });

  transactions_copy.forEach((item, i) => {
    let pos = stocks.indexOf(item.spolka);
    if(item["tytuł operacji"] == 'K' && item.aktualna_ilosc > 0) {
      stocksCountArray[pos].akcje_posiadane += parseFloat(item.aktualna_ilosc);
      stocksCountArray[pos].cena += Math.abs(parseFloat(item.kwota));
      stocksCountArray[pos].zysk -= Math.abs(parseFloat(item.kwota));
      stocksCountArray[pos].dywidenda_zysk += parseFloat(item.dividend);
    } else if(item["tytuł operacji"] == 'K') {
      stocksCountArray[pos].cena += Math.abs(parseFloat(item.kwota));
      stocksCountArray[pos].dywidenda_zysk += parseFloat(item.dividend);
    } else if(item["tytuł operacji"] == 'S') {
      stocksCountArray[pos].akcje_sprzedane += parseInt(item.aktualna_ilosc);
      if(parseInt(item.data.substr(0,4)) == current_year) {
          stocksCountArray[pos].zysk += parseFloat(item.kwota)-parseFloat(stocksCountArray[pos].cena);
      }
    }
  });
  console.log(transactions_copy);
  stocksCountArray.forEach((item, i) => {
    if(item.akcje_posiadane != 0) {
      item.cena = parseFloat(item.cena / item.akcje_posiadane).toFixed(2);
    } else if(item.akcje_posiadane == 0) {
      item.cena = parseFloat(item.cena / item.akcje_sprzedane).toFixed(2);
    }
    transactions_copy.forEach((transakcja, i) => {
      if(transakcja.spolka == item.spolka && parseInt(transakcja.data.substr(0,4)) < current_year && transakcja["tytuł operacji"] == 'K') {
        item.przeszla_ilosc += transakcja.ilosc;
        item.przeszla_suma += Math.abs(transakcja.kwota);
      } else if(transakcja.spolka == item.spolka && parseInt(transakcja.data.substr(0,4)) < current_year && transakcja["tytuł operacji"] == 'S') {
        item.przeszla_ilosc -= transakcja.ilosc;
        item.przeszla_suma -= Math.abs(transakcja.kwota);
      }
    });
  });

  let string = '<h3 class="text-center">Portfel teraz</h3>' + '<table class="table table-light table-striped"><tr><th scope="col">#</th><th scope="col">Spółka</th><th scope="col">Ilość</th><th scope="col">Średnia cena</th><th scope="col">Zysk z ceny</th><th scope="col">Dywidenda</th><th scope="col">Cena teraz</th>><th scope="col">Zysk</th></tr>';
  let calkowity_zysk = 0;
  for(let i = stocksCountArray.length-1; i >= 0; i--) {
    let spreadsheet_obj = stock_price_data.filter(d => d.Bossa == stocks[i])[0];
    let price_now = parseFloat(String(spreadsheet_obj.Cena).replace(/[,]/g, '.'));
    let price_then = parseFloat(String(spreadsheet_obj.Przeszla_cena).replace(/[,]/g, '.'));
    stocksCountArray[i].zysk += parseFloat(price_now*stocksCountArray[i].akcje_posiadane);
    let zysk = stocksCountArray[i].zysk - (stocksCountArray[i].przeszla_ilosc*price_then - stocksCountArray[i].przeszla_suma);
    if(isNaN(zysk)) {
      zysk = stocksCountArray[i].zysk;
    }
    let filter_dividend = div.filter(d => parseInt(d.data.substr(0,4)) == current_year && d.spolka == stocks[i]);
    let dywidenda = parseFloat(d3.sum(filter_dividend, d => d.kwota));
    calkowity_zysk += zysk + dywidenda;
    if(stocksCountArray[i].akcje_posiadane != 0 || zysk != 0) {
      string += '<tr><td scope="row">' + (stocksCountArray.length-i) + '</td><td>' + stocks[i] + '</td><td>' + stocksCountArray[i].akcje_posiadane + '</td><td>' + stocksCountArray[i].cena + '</td><td>' + parseFloat(zysk).toFixed(2) + '</td><td>' + parseFloat(dywidenda).toFixed(2) + '</td><td>' + price_now + '</td><td>' + parseFloat(dywidenda + zysk).toFixed(2) + '</td></tr>';
    }
  }
  string += '<tr><td scope="row"></td><th>Suma</th><td></td><td></td><td></td><td></td><td></td><th>' + parseFloat(calkowity_zysk).toFixed(2) + '</th></tr>';
  string += "</table>";
  stocksCountArray.forEach((item, i) => {
    item.zysk = parseFloat(item.zysk).toFixed(2);
    item.zysk_suma = parseFloat(item.zysk + item.dywidenda_zysk).toFixed(2);
  });

  let chart_container = document.getElementById("container");
  chart = new CircleChart(chart_container, stocksCountArray);
  chart.init();

  transakcje.innerHTML += string;
}
function showTable(data) {
  let transakcje = document.getElementById("transakcje");
  let string = '<h3 class="text-center">Operacje</h3>' + '<table class="table table-light table-striped"><tr><th scope="col">#</th><th scope="col">Data</th><th scope="col">Tytuł</th><th scope="col">Szczegóły</th><th scope="col">Kwota</th></tr>';
  for(let i = data.length-1; i >= 0; i--) {
    string += '<tr><td scope="row">' + (data.length-i) + '</td><td>' + data[i].data + '</td><td>' + data[i]["tytuł operacji"] + '</td><td>' + data[i]["szczegóły"] + '</td><td>' + data[i].kwota + '</td></tr>';
  }
  string += "</table>";
  transakcje.innerHTML += string;
}
function showTransactionTable(data) {
  let transakcje = document.getElementById("transakcje");
  let string = '<h3 class="text-center">Transakcje</h3>' + '<table class="table table-light table-striped"><tr><th scope="col">#</th><th scope="col">Data</th><th scope="col">Aktywo</th><th scope="col">Ilość</th><th scope="col">Cena</th><th scope="col">Kwota</th><th scope="col">Suma dywidend</th><th scope="col">Zwrot dywidenda</th><th scope="col">Zwrot wzrost</th><th scope="col">Zwrot</th></tr>';
  for(let i = data.length-1; i >= 0; i--) {
    let obj = data[i];
    let obj_dividends = dividends.filter((d) => d.spolka == obj.spolka && new Date(d.data) > new Date(obj.data));
    let dividend = d3.sum(obj_dividends, d => d.dividend_per_stock);
    data[i].dividend = parseFloat(dividend*data[i].ilosc).toFixed(2);
    let spreadsheet_obj = stock_price_data.filter(d => d.Bossa == obj.spolka)[0];
    let price_now = parseFloat(String(spreadsheet_obj.Cena).replace(/[,]/g, '.'));
    if(parseInt(obj.data.substr(0,4)) == current_year) {
      if(data[i].kwota > 0) {
        string += '<tr><td scope="row">' + (data.length-i) + '</td><td>' + data[i].data + '</td><td>' + data[i].spolka + '</td><td>' + data[i].ilosc + '</td><td>' + data[i].cena
        + '</td><td>' + data[i].kwota + '</td><td>' + parseFloat(dividend*data[i].ilosc).toFixed(2)  + '</td><td>-</td><td>-</td><td>-</td></tr>';
      } else {
        string += '<tr><td scope="row">' + (data.length-i) + '</td><td>' + data[i].data + '</td><td>' + data[i].spolka + '</td><td>' + data[i].ilosc + '</td><td>' + data[i].cena
        + '</td><td>' + data[i].kwota + '</td><td>' + parseFloat(dividend*data[i].ilosc).toFixed(2)  + '</td><td>' + parseFloat((dividend*data[i].ilosc)/(data[i].ilosc*data[i].cena)*100).toFixed(2) + "% "
        + '</td><td>' + parseFloat(price_now/data[i].cena*100-100).toFixed(2) + "% " + '</td><td>' + parseFloat((dividend*data[i].ilosc)/(data[i].ilosc*data[i].cena)*100+price_now/data[i].cena*100-100).toFixed(2) + "% " + '</td></tr>';
      }
    }
  }
  string += "</table>";
  console.log(data);
  transakcje.innerHTML += string;
}
function showDividendTable(data) {
  let transakcje = document.getElementById("transakcje");
  data = data.filter(d => parseInt(d.data.substr(0,4)) == current_year); //check if
  let string = '<h3 class="text-center">Dywidendy</h3>' + '<table class="table table-light table-striped"><tr><th scope="col">#</th><th scope="col">Data</th><th scope="col">Aktywo</th><th scope="col">Kwota</th></tr>';
  for(let i = data.length-1; i >= 0; i--) {
    string += '<tr><td scope="row">' + (data.length-i) + '</td><td>' + data[i].data + '</td><td>' + data[i].spolka + '</td><td>' + data[i].kwota + '</td></tr>';
  }
  string += "</table>";
  transakcje.innerHTML += string;
}
function draw() {
  if(chart != undefined) {
    chart.refresh();
  }
}
window.onresize = draw;
