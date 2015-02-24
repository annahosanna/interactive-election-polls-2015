//TODO:
// 1. load avg data from sheets
// 2. add text of avg on over time hover
// 3. put hammer.js in the folder
// 4. fix tooltip on resize
// 5. add voronoi for circle picking
define([
  'd3',
  'pollchart/hammer.js',
  'pollchart/polldata.js'
], function(
  d3,
  Hammer,
  polldata
) {
  'use strict';
  
  // Data:
  var dayUnit,
      dayConst = 86400000,
      termDic = { con: "Con", lab: "Lab", ukip: "UKIP", ldem: "LD", grn: "Green", 
                  YouGov: "YouGov", Populus: "Populus", "Lord Ashcroft": "Ashcroft", Opinium: "Opinium", 
                  ComRes: "ComRes", ComResO: "ComRes Online", TNS: "TNS BMRB", ICM: "ICM", Ipsos: "Ipsos-MORI", Survation: "Survation" };
  
  var data, dataset,
      svgParty, svgPolls, svgDates, svgRects,
      dateList; 

  // Date format:
  var dateStr, dateEnd, //TODO: fix left padding; 7/5 election date
      dateFormat = "%d/%m/%Y",
      xAxisTextFormat,
      formatMon = d3.time.format("%b"),
      formatMonth = d3.time.format("%B"),
      formatPercent = d3.format(".0%");
  // Parse the date / time
  var parseDate = d3.time.format(dateFormat).parse;
  
  // Window size and chart's coordinate system:
  var width, height,
      margin = {top: 30, right:0, bottom: 30, left: 0},
      xAxis, yAxis, x, y,
      coord = {x: 0, y: 40};


  function render(el, rawData) {
    
    setChartSize();
    
    /* Data */
    data = rawData.sheets["vi-continuous-series"];
    // Parse date
    data = data.map(function(d) {
      // + convert a Date object to time in milliseconds
      d.timestamp = +parseDate(d.date); 
      return d;  
    }).filter(function(d) {
      //return d.date >= (+parseDate(dateStr)); 
      return d.timestamp >= (+parseDate(dateStr)); 
    });
    
    dateList = polldata.extractDataByKey(data, "timestamp");
    dataset = polldata.composeDataByParty(data, dateList);
    

    /* D3: Drawing
    /* ******/
    // x, y axes; circle, path, area (polygon as range), text
    var gx, gy ,gp, ga, gt, gr,
        gcPoll, gcDate;
    
    // Add the svg
    var svg = d3.select("#pollchart")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Define the line
    var line = d3.svg.line()
                 .x(function(d) { return x(d.date); })
                 .y(function(d) { return y(d.vi); });


    function addCoordinate () {
      gx = svg.append("g").attr("class", "x axis ff-ss fz-12");
      gy = svg.append("g").attr("class", "y axis ff-ss fz-12");
    }
    function drawCoordinate() {
      // x axis
      gx.attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")
      .attr("x", -2)
      .style("text-anchor", "start");
      // y axis
      gy.call(yAxis);
      gy.selectAll("g")
      .filter(function(d) { return d; })
      .classed("sc-ddd", true);
      gy.selectAll("text")
      .attr("x", 0)
      .attr("dy", -3);
    }

    // avg path
    function addPathWithLines(svgObj, className){
      gp = svgObj.append("path")
      .attr("class", className); 
    }
    function drawPathWithLines(){
      gp.attr("d", function(d) { return line(d.values); })
    }

    //TODO: change to use muti-line voronoi
    function addPolygons(svgObj, className) {
      ga = svgObj.append("polygon")
      .attr("class", className);
    } 
    function drawPolygons() {
      ga.attr("points", function(d) { 
        var points,
        yMax, yMin, ptMax, ptMin;

        // area for avg line and all vi dots
        ptMax = d.values.map(function(d) {
          //console.log(d);
          yMax = (d.viMax > d.vi) ? y(d.viMax) : y(d.vi) - 10;
          return [x(d.date), yMax].join(","); 
        }).join(" ");
        ptMin = d.values.map(function(d) { 
          yMin = (d.viMin < d.vi) ? y(d.viMin) : y(d.vi) + 10;
          return [x(d.date), yMin].join(","); 
        }).reverse().join(" ");
        //TODO: area for detection
        // ...

        points = [ptMax, ptMin];
        return points;
      });
    }
    function onPolygon() {
      var ele;
      ga.on("mouseover", function(d) { 
        ele = document.querySelector(".party-polls." + d.party)
        ele.classList.add("op-1-polls");
        this.parentNode.classList.add("op-1-path"); 
      })
      .on("mouseout",  function(d) { 
        ele.classList.remove("op-1-polls");
        this.parentNode.classList.remove("op-1-path"); 
      });
    }

    function addRects(svgObj, className) {
      gr = svgObj.append("rect")
      .attr("class", function(d) { return "t" + d; });
    }
    function drawRects(svgObj) {
      gr.attr("x", function(d) { return x(d) - (x(d) - x(d - dayConst)) / 2; })
      .attr("y", 0)
      .attr("width", function(d) { return (x(d) - x(d - dayConst)); })
      .attr("height", height); 
    }
    function onRects() {
      var cn, nl; //class name, node list
      gr.on("mouseover", function(d) {
        nl = document.querySelectorAll(".t" + d + ".op-0");
        for (var i=0; i<nl.length; i++) { nl[i].classList.remove("op-0"); }
      })
      .on("mouseout", function(d) {
        for (var i=0; i<nl.length; i++) { nl[i].classList.add("op-0"); }
      });

      // test with hammerjs
        var el = document.querySelector(".dates"),
        op = { preventDefault: true },
        hr = new Hammer(el, op),
        preCN = null, // CN, classname
        curCN,
        strCN,
        numCN;

        hr.get("pan").set({ direction: Hammer.DIRECTION_HORIZONTAL });
        hr.on("panstart", function(e) {
        strCN = e.target.className.baseVal;
        var s = strCN.slice(1);
        numCN = parseInt(s);
      //console.log(strCN);
      });
      hr.on("panmove", function(e) {
      var d = Math.round(e.deltaX / dayUnit);
      curCN = "t" + (numCN + dayConst * d);

      if (preCN === curCN ) { return; } 
      // remove highlight 
      //console.log(curCN);
      if (preCN !== null) {
      for (var i=0; i<nl.length; i++) { nl[i].classList.add("op-0"); } 
      }
      // add hightlight
      nl = document.querySelectorAll("." + curCN + ".op-0");
      for (var i=0; i<nl.length; i++) { nl[i].classList.remove("op-0"); }
      preCN = curCN;
      });
      hr.on("panend", function(e) {
      //console.log(curCN, "end");
      for (var i=0; i<nl.length; i++) { nl[i].classList.add("op-0"); }
      });
    }

    function drawCircle(svgObj, cx, cy, r, className) {
      svgObj.append("circle")
        .attr("class", className)
        .attr("cx", cx) 
        .attr("cy", cy)
        .attr("r", r);
    }

    function addCircles(svgObj, className, key) {
      var g = svgObj.selectAll("circle")
        .data(function(d) { return d.values; })
        .enter().append("circle")
        //.attr("class", className);
        .attr("class", function(d) { return "t" + d[key] + " " + className; });
      return g;
    }

    function drawCircles(gc, r) {
      gc.attr("cx", function(d) { return x(d.date) /*+ Math.random()*10*/; })
      .attr("cy", function(d) { return y(d.vi); })
      .attr("r", r);
    }

    function onCirclePoll(gc) {
      var ele, eleList;

      gc.on("mouseover", function(d) {
        // 1. Add tooltip
        var xPos = parseFloat(d3.select(this).attr("cx")),
        yPos = parseFloat(d3.select(this).attr("cy")),
        xPosEnd = x(parseDate(dateEnd)),
        yShift = 60,
        date = new Date(d.date),
        dateText = date.getDate() + " " + formatMonth(date);

        //drawLine(svg, xPos, yPos - 8, xPos, yPos - 120, "tp-line");
        drawCircle(svg, xPos, yPos, 5, "tp-circle");

        ele = document.querySelector("#tpTextBox");
        ele.classList.remove('d-n');

        // top or bottom  
        ele.style.top = ((yPos - yShift) < (-10)) ? ((yPos + yShift) + "px") : ((yPos - yShift) + "px");
        if (xPos < (xPosEnd - 100)) {
          // align right
          ele.style.left = (xPos - 5) + "px";
          ele.style.right = "auto";
        } else {
          // align left
          ele.style.left = "auto";
          ele.style.right = (xPosEnd - xPos - 10) + "px";
        }

        //TODO: bottom if too height access the iframe
        eleList = ele.children;
        eleList[0].textContent = termDic[d.pollster];                 //pollster
        eleList[1].textContent = dateText;                            //date
        eleList[2].textContent = termDic[d.party] + " " + d.vi + "%"; //party and vi
        eleList[2].classList.add(d.party);

        // 2. highlight paths
        this.parentNode.classList.add("op-1-pathpolls");
        d3.select("." + d.party).classed("op-1-path", true);
      })
      .on("mouseout", function(d) {
        // 1. Remove tooltip
        //svg.select(".tp-line").remove();
        svg.select(".tp-circle").remove();

        ele.classList.add('d-n');
        eleList[2].classList.remove(d.party);

        // 2. Remove highlight
        this.parentNode.classList.remove("op-1-pathpolls");
        d3.select("." + d.party).classed("op-1-path", false);
      });
    }

    function addText(svgObj, className, key) {
      gt = svgObj.append("text")
      //TODO: make sure data order
      .datum(function(d) { return {key: d[key], value: d.values[d.values.length - 1], party: d.party}; })
      .attr("class", className);
    } 
    function drawText() {
      gt.attr("text-anchor", "left")
      .attr("x", function(d){ return x(d.value.date) + 8; })
      .attr("y", function(d){ return y(d.value.vi) + 6; })
      .text(function(d) { 
        var num = (d.value.vi).toFixed(1); 
        return d.party === "lab" ? num + "%" : num; 
      });
    }
    
    function drawSVGInit(){
      // 1. Draw coordinate
      addCoordinate();
      drawCoordinate();

      svgRects = svg.append("g")
        .attr("class", "dates op-0")
        .selectAll("rect")
        .data(dateList)
        .enter();

      svgParty = svg.selectAll("party")
        .data(dataset.date)
        .enter().append("g")            
        .attr("class", function(d) { return "party " + d.party; });

      svgDates = svg.selectAll("party-dates")
        .data(dataset.date)
        .enter().append("g")            
        .attr("class", function(d) { return "paraty-dates " + d.party; });

      svgPolls = svg.selectAll("party-polls")
        .data(dataset.pollster)
        .enter().append("g")
        .attr("class", function(d) { return "party-polls " + d.party; })
        .selectAll("g")
        .data(function(d) { return d.pollster; })
        .enter().append("g")
        .attr("class", function(d, index) { return "pollster p" + index;} );

      // 2. Draw over time view
      gcDate = addCircles(svgDates, "op-0", "date"); 
      drawCircles(gcDate, 3.5);
      addRects(svgRects);
      drawRects();
      onRects();

      // 3. Draw area, path (with lines) - avarage, text
      addText(svgParty, "ff-ss fz-14", "party");
      drawText();

      addPathWithLines(svgParty, "path-avg");
      drawPathWithLines();
      addPolygons(svgParty, "polygon-range");
      drawPolygons(svgParty);
      onPolygon(); 

      // 4. Draw path (with lines) - individuals, text
      //drawPathWithLines(svgPolls, "path-polls");
      //drawText(svgPollster, "pollster");

      // 5. Draw circle - vi
      gcPoll = addCircles(svgPolls, "circle-poll");
      drawCircles(gcPoll, 3);
      onCirclePoll(gcPoll);
    }

    function drawSVG() {
      drawCoordinate();  
      drawText();
      drawPathWithLines();
      drawPolygons();
      drawCircles(gcPoll, 3);
      drawCircles(gcDate, 3.5);
      drawRects();

      //TODO: remove hotfix
      var ele;
      svg.select(".tp-circle").remove();
      ele = document.querySelector("#tpTextBox");
      ele.style.top = "-100px";
      ele.style.left = "-100px";
      ele.style.rifht = "auto";
      eleList = ele.children;
      eleList[2].className = "";
    }

    function resize() {
      setChartSize();
      drawSVG();
    }

    drawSVGInit();
    d3.select(window).on('resize', resize); 
    /* ************/
  }

  /* Window size update and redraw 
  /* ******/
  // Window resize 
  function setChartSize() {
    // Dimensions of the chart
    var w = window,
        d = document,
        e = d.documentElement,
        //p = d.querySelector("#pollchart").parentNode,
        w = e.clientWidth || w.innerWidth,
        h = e.clientHeight || w.innerHeight,
        w = w - 10,
        h = 400 - 15,
        str;

    width = w - margin.left - margin.right;
    height = h - margin.top - margin.bottom;

    //p.setAttribute("width", w);
    //p.setAttribute("height", h);

    // Ranges of the charts
    x = d3.time.scale().range([0, width]);
    y = d3.scale.linear().range([height, 0]);

    // Define the axes
    xAxis = d3.svg.axis().scale(x).orient("bottom")
      .ticks(d3.time.month),  
      yAxis = d3.svg.axis().scale(y).orient("right")
        .ticks(5).tickSize(width)
        .tickFormat(function(d) {
            return d === 40 ? formatPercent(d / 100) : d ;
            });

    // for mobile
    if (width < (660 - 10)) {
      var today = new Date,
          month = today.getMonth() + 1;

      dateStr = "24/11/2014"; 
      dateEnd = (today.getDate() + 11) + "/" + month + "/" + today.getFullYear();
      xAxisTextFormat = formatMon;
    } else {
      dateStr = "20/11/2014";  
      dateEnd = "15/05/2015";
      xAxisTextFormat = formatMonth;
    }

    // Scale the range of the data
    x.domain([parseDate(dateStr), parseDate(dateEnd)]);
    y.domain([coord.x, coord.y]); 

    str = +parseDate(dateStr);
    dayUnit = x(str + dayConst) - x(str);

    // xAxis format
    xAxis.tickFormat(xAxisTextFormat);

    // resize the chart
    d3.select("#pollChart")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
  } 
  /* ************/

  return {
    render: render
  };
});
