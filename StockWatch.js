//
// StockWatch - My Fourth Node App
//
// Looks up stock prices and upcoming dividend details
// via Yahoo REST and the asbsecurities.co.nz website
//
// Jon Brown - 1.0 - 2 Sep 2014 - First version
//             1.1 - 9 Sep 2014 - Amended to support UTC dates when run on Bluemix
//             1.2 - 9 Sep 2014 - Highlighted large movers in yellow
//

var version = 1.2; // ** CHANGE THIS WITH NEW VERSION **

var DST = 1;       // 1 when Daylight Saving is in force (Oct-Mar), 0 otherwise

var request = require('request');
var cheerio = require('cheerio');

var port = (process.env.VCAP_APP_PORT || 8124);
var host = (process.env.VCAP_APP_HOST || '192.168.0.117'); // 'localhost');
var http = require('http');

var Bluemix = (process.env.VCAP_APP_HOST || 'N');

//details = [[]]; // ['Please reload this page'];
codes = ['AGK', 'ANZ', 'BHP', 'CBA', 'IOZ', 'LLC', 'NAB', 'NCM', 'SHL', 'TLS', 'WBC', 'WES', 'WFD', 'GNC', 'IAG', 'JBH', 'MGX', 'NHF', 'QBE', 'RIO', 'SUL' ];

div_count = 0; // How many have dividends

// details is an array that holds these 9 details:
// 0 -> stock code
// 1 -> last price
// 2 -> chg
// 3 -> chg percent
// 4 -> XD date
// 5 -> Payment date
// 6 -> amount
// 7 -> franking
// 8 -> company name

var detailsMax  = 9;  // Maximum number of details
var details     = new Array();
for (i = 0; i < codes.length; i++) {
 details[i]=new Array();
 for (j = 0; j < detailsMax; j++) {
  details[i][j]='';
 }
}

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write("<title>Stock::Watch</title>");
  res.write('<font face="Arial">'); // Looks a bit nicer in Arial
  if (Bluemix == 'N') {
	res.write('<font color="DarkBlue">');
  } else {
	res.write('<font color="Blue">');
  }
  res.write('<B>Stock::Watch</B></font>');

  var started = new Date; // Local time if running on Laptop, UTC if running on Bluemix
  var now;
  if (Bluemix == 'N') {
    now = started;
  } else {
//	res.write(' on Bluemix');
    now = new Date(started.getTime() + (3600*1000*(10 + DST))); // Convert Bluemix time to Melbourne time (UTC+10)
  }

//  res.write('<BR>utc = ' + utc + '<BR>');
//  res.write('<BR>now = ' + now + '<BR>');

  var start  = started.getTime();     // Used to time the function
  var start2 = process.hrtime();  // And this does it in nanoseconds!
  
  var url = 'https://www.asbsecurities.co.nz/quotes/upcomingevents.aspx';
//  console.log("Looking for Dividends: " + url);
  getDividends(url,res);

  var url    = 'http://finance.yahoo.com/d/quotes?s=';
  var format = '&f=sl1c1p2'; 
  var d;
  
  for (d in codes) {
    if (d > 0) url += '+';
    url += codes[d] + '.AX'; // Create a list of stocks we're interested in 
  }
  
  url += format; // Tell Yahoo what format we want back
//  console.log("Looking for Prices: " + url);
  getPrices(url,res);

  var dd = now.getDate();
  var mm = now.getMonth()+1; //January is 0!

  var arrMonths = new Array ('Jan','Feb','Mar','Apr','MAy','Jun','Jul','Aug','Sep','Oct','Nov','Dec');
  var today = dd + ' ' + arrMonths[mm-1]; // Format is d Mmm
  
  var hr = now.getHours();
  var xm = 'am';
  if (hr > 12) {
    hr = hr - 12;
	xm = 'pm';
  }
  if (hr == 0) {
	hr = 12; // Midnight should be 12am not 0am
  }
  var mins = now.getMinutes();
  var nicemins = mins;
  if (mins < 10) {
    nicemins = '0' + mins;
  }
  
  var secs = now.getSeconds();
  var nicesecs = secs;
  if (secs < 10) {
    nicesecs = '0' + secs;
  }
  res.write(' at ' + hr + ':' + nicemins + '.' + nicesecs + xm + ' on ' + today + ' <br><br>');

//  Show realtime chart too - with time stamp added so does not get cached
  res.write('<IMG SRC="http://www.asx.com.au/asx/widget/chart.do?asxCode=XJO&type=INDEX&' + start + '" alt="<Live Chart>"/><br><br>');
  
  var n=0;
  var m=0; // index into codes
  res.write('<TABLE>');
  if (details[0][0].length == 0) {
    res.write('<b>Please reload to see content</b>');
  } else {
    res.write('<TR><TD>Code</TD><TD align="right">Price</TD><TD align="right">Change</TD><TD align="right">Change</TD><TD align="right">XD</TD><TD align="right">Paid</TD><TD align="right">Cents</TD><TD align="right">Franking</TD></TR>'); // <TD>&nbsp;Company</TD>
  }
  for (n in codes) {
    for (m = 0; m < detailsMax; m++)
    {
    switch(m)  
      {
      case 0: res.write('<TR><TD><B>' + details[n][m] + '</B></TD>'); // Stock code
              break;
      case 1: res.write('<TD align="right">' + details[n][m] + '</TD>'); // Last price as dollars and cents
              break;
      case 2: res.write('<TD align="right">&nbsp;'); // Change in dollars
              if (details[n][m].charAt(0) == '-') {  // Negative
                res.write('<font color="red">');
              } else {
                res.write('<font color="blue">');
              }
              res.write(details[n][m] + '</font></TD>');
              break;
      case 3: if ((details[n][m].charAt(1) == '0') || (details[n][m].charAt(1) == '.')) { // Move < 1% or 0%
                  res.write('<TD align="right">&nbsp;');
              } else {
                  res.write('<TD align="right" bgcolor="yellow">&nbsp;'); // Highlight moves >= 1% in bold
	      }
	      if (details[n][m].charAt(0) == '-') {  // Negative
                res.write('<font color="red">');
              } else {
                res.write('<font color="blue">');
              }
              if ((details[n][m].charAt(1) == '0') || (details[n][m].charAt(1) == '.')) { // Move < 1% or 0%
                  res.write(details[n][m] + '</font></TD>');
              } else {
                  res.write('<B>' + details[n][m] + '</B></font></TD>'); // Moves >= 1% in bold
              }
              break;  
      case 4: res.write('<TD align="right">&nbsp;');
              if (details[n][m] == today) {
                res.write('<font color="red"><B>' + details[n][m] + '</B></font></TD>'); // XD today
              } else {
                res.write(details[n][m] + '</TD>');
              }
              break;
      case 5: res.write('<TD align="right">&nbsp;');
              if (details[n][m] == today) {
                res.write('<font color="green"><B>' + details[n][m] + '</B></font></TD>'); // Paid today
              } else {
                res.write(details[n][m] + '</TD>');
              }
              break;
      case 6: res.write('<TD align="right">&nbsp;' + details[n][m] + '</TD>'); // Dividend amount
              break;
      case 7: res.write('<TD align="right">&nbsp;' + details[n][m] + '</TD>'); // Franking %
              break;
      case 8: // Don't write company name res.write('<TD>&nbsp;' + details[n][m] + '</TD>'); // Company name is last
              res.write('</TR>'); // Finished one row
              break;
      default: console.log("Unknown m value in table!")
      }
    }
  }
  
  res.write('</TABLE>');
//  var done = Math.round(n/6);
  
  var end  = new Date().getTime();
  var end2 = process.hrtime();
  var time = end - start;
  var time2 = end2[1]-start2[1];
  
  res.write('<br>Found ' + codes.length + ' (' + div_count + ' with dividends)');
  res.write(' in ' + time + ' milliseconds'); // / ' + time2 + ' nanoseconds');
    
  res.end('<br><hr>&copy; Jon Brown - v' + version + ' - Aug, Sep 2014</font>');   
}).listen(port, host);

if (Bluemix == 'N') {
  console.log('Server running LOCALLY at ' + host + ':' + port);
} else {
  console.log('Server running on BLUEMIX at ' + host + ':' + port);
}

function getDividends(url,res) {
  request(url, function(err, resp, body) {
    if (err) throw (err);
//    console.log('About to process Cheerio body');
    var d;
    var found;
    var count = 0;
    div_count = 0;
    for (d in codes) {
      count = 0;
      found=false;
      var $ = cheerio.load(body);
      $('td').each(function(i,row){
        count++;
        if ($(this).text() == codes[d]) // && (found == false)) not required as we return false to break out
        {
 //         console.log('Found ' + codes[d] + ' with d=' + d); // Bug if Stock = Name eg QBE
          details[d][0]=$(this).text();        // Stock
          details[d][8]=$(this).next().text(); // Name
          var xd = $(this).next().next().text().substring(0, 6);
          if (xd.charAt(0) == '0') {
            xd = xd.substr(1,5)
          }
          details[d][4]=xd;   // XD as n Mmm not nn Mmm,yy
          var paid = $(this).next().next().next().text().substring(0, 6);
          if (paid.charAt(0) == '0') {
            paid = paid.substr(1,5)
          }
          details[d][5]=paid; // Paid date as n Mmm not nn Mmm,yy
          details[d][6]=$(this).next().next().next().next().text();          // Amount
          details[d][7]=$(this).next().next().next().next().next().text();   // Franking
//        var all = $(this).parent().children().text(); // All of the above        
          found=true;
          div_count++;
          return false; // Exit this for-each so we don't keep going
        }
      });
      if (!found) {
//        console.log('Did not find ' + codes[d]);
        details[d][0]=codes[d];// Stock
        details[d][8]='';      // Name
        details[d][4]='';      // XD as nn Mmm not nn Mmm,yy
        details[d][5]='';      // Paid date as nn Mmm not nn Mmm,yy
        details[d][6]='';      // Amount
        details[d][7]='';      // Franking  
      }
//      console.log('Count ' + count);
    }
  console.log('Dividend Count ' + div_count);
  })
} // getDividends

function getPrices(url,res) {
  request(url, function(err, resp, body) {
    if (err) throw (err);
//    console.log('Received:' + body);
    var content = body.replace(/\"/g, ','); // Convert all quotes to commas
    content = content.replace(/.AX/g, '');  // Remove the .AX from stock codes
    content = content.replace(/,,/g, ',');  // Remove any double commas
    // Resulting data is like this: ,SUL,9.310,-0.060,-0.64%,
    
    prices = [];
    prices = content.split(",");
//    console.log('Found ' + prices);
    var n = 0;
    var m = 0;
    var done = 0;
//  Load prices into array
    for (n in prices) {
      switch(m)  
      {
        case 0: break; // Ignore blank entry
        case 1: break; // Ignore Stock code
        case 2: details[done][1] = prices[n].slice(-7,-1); // Last price as dollars and cents
              break;
        case 3: details[done][2] = prices[n].slice(-7,-1); // Change in dollars
              break;
        case 4: details[done][3] = prices[n] // Change in percent
              break;
        default: console.log("Unknown m value in Prices!")
      }
      m++;
      if (m == 5) {
        m = 0; // New stock
        done ++;
      }
    }
    console.log('Price Count ' + done);
  })
} // getPrices
