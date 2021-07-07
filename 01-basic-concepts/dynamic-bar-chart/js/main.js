///////////////////////////////////////////////////////////////////////////
////////////////////// SETTINGS WHICH WILL NOT CHANGE /////////////////////
///////////////////////////////////////////////////////////////////////////

const CANVAS_MARGIN = { left: 80, right: 10, top: 10, bottom: 60 };
const GROUP_WIDTH = 600 - CANVAS_MARGIN.left - CANVAS_MARGIN.right;
const GROUP_HEIGHT = 400 - CANVAS_MARGIN.top - CANVAS_MARGIN.bottom;

let isRevenue = true;

const group = d3
  .select("#chart-area")
  .append("svg")
  .attr("width", GROUP_WIDTH + CANVAS_MARGIN.left + CANVAS_MARGIN.right)
  .attr("height", GROUP_HEIGHT + CANVAS_MARGIN.top + CANVAS_MARGIN.bottom)
  .attr("style", "border:1px solid black;")
  .append("g")
  .attr("transform", `translate(${CANVAS_MARGIN.left}, ${CANVAS_MARGIN.top})`);

// the domain will be set in the "updateChart" function
const xScale = d3
  .scaleBand()
  .range([0, GROUP_WIDTH])
  .paddingInner(0.2)
  .paddingOuter(0.2);

// the domain will be set in the "updateChart" function
const yScale = d3.scaleLinear().range([GROUP_HEIGHT, 0]);

// the domain will be set in the "updateChart" function
const colourScale = d3
    .scaleOrdinal()
    .range(d3.schemeTableau10);

const xAxisCall = d3.axisBottom(xScale);

const yAxisCall = d3.axisLeft(yScale).tickFormat((data) => `$${data}`);

const xAxisGroup = group
  .append("g")
  .attr("transform", `translate(0, ${GROUP_HEIGHT})`)

const yAxisGroup = group.append("g");

// this text will stay the same every update
group.append("text")
  .text("Month")
  .attr("x", GROUP_WIDTH / 2)
  .attr("y", GROUP_HEIGHT + 45)
  .attr("font-size", 15)
  .attr("font-family", "Comic Sans MS")
  .attr("text-anchor", "middle"); 

// the text will be set in the "updateChart" function
const yLabel = group
  .append("text")
  .attr("x", -GROUP_HEIGHT / 2)
  .attr("y", -55)
  .attr("transform", "rotate(-90)")
  .attr("font-size", 15)
  .attr("font-family", "Comic Sans MS")
  .attr("text-anchor", "middle");

////////////////////////////////////////////////////////////////////////////////////////
////////////////////// SETTINGS WHICH WILL BE UPDATED PERIODICALLY /////////////////////
////////////////////////////////////////////////////////////////////////////////////////
const updateChart =(data) => {
  const property = isRevenue ? "revenue" : "profit";

  // we are passing a number of milliseconds throught which the transition will be applied
  // it's important to keep the length of the duration lower then the number of the loop delay
  const transition =  d3.transition().duration(750);

  xScale.domain(data.map((dataItem) => dataItem.month));
  yScale.domain([0, d3.max(data, (dataItem) => dataItem[property])]);
  colourScale.domain(data.map((dataItem) => dataItem.month));

  xAxisGroup
    // any attributes we set BEFORE the transition are applied straight away
    .transition(transition)
    // but any attributes we set AFTER the transition are applied gradually
    .call(xAxisCall)
    .selectAll("text")
      .attr("x", "-5")
      .attr("y", "10")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-40)")

  yAxisGroup
    .transition(transition)
    .call(yAxisCall);

  yLabel.text(isRevenue ? "Revenue": "Profit");

  ////////////////////////////////////////////////////////////////////////////
  ///////////////////////////// D3 UPDATE PATTERN ////////////////////////////
  ////////////////////////////////////////////////////////////////////////////

  // 1. JOIN new data with old elements
  // virtual elements "rect" will be tied to our data array
  const bars = group.selectAll("rect").data(data);

  // 2. EXIT old elements not present in new data
  // all "rect" elements which are displayed, BUT are not in new data will be removed
  // "exit()" method is returning a virtual selection of all of the SVGs that need to be removed
  bars.exit()
    .transition(transition)
      .attr("y", yScale(0))
      .attr("height", 0)
      .remove();

  // 3. UPDATE old elements present in new data
  // all "rect" elements which are displayed AND are in new data will be updated
  bars
    // any attributes we set BEFORE the transition are applied straight away
    .transition(transition)
      // but any attributes we set AFTER the transition are applied gradually
      .attr("x", (data) => xScale(data.month))
      .attr("y", (data) => yScale(data[property]))
      .attr("width", xScale.bandwidth())
      .attr("height", (data) => GROUP_HEIGHT - yScale(data[property]))

  // 4. ENTER new elements present in new data
  // all "rect" elements which are NOT displayed AND are in new data will be displayed
  // we're getting a hold of all the rects that we need to enter onto the screen with our "enter()" method, 
  // and then we're adding a rectangle for each one of them.
  bars
    .enter()
    .append("rect")
    // any attributes we set BEFORE the transition are applied straight away
    .attr("fill", (data) => colourScale(data.month))
    // initial y-position before the transition
    .attr("y", yScale(0))
    // initial height before the transition
    .attr("height", 0)
    .transition(transition)
      // but any attributes we set AFTER the transition are applied gradually
      .attr("x", (data) => xScale(data.month))
      .attr("width", xScale.bandwidth())
      // y-position after the transition
      .attr("y", (data) => yScale(data[property]))
      // height after the transition
      .attr("height", (data) => GROUP_HEIGHT - yScale(data[property]))
};


(async () => {
  const dataCsv = await d3.csv("data/revenues.csv");
  dataCsv.forEach((data) => {
    data.revenue = Number(data.revenue);
    data.profit = Number(data.profit);
  });

  // function "d3.interval" works the same way as "setInterval" in Javascript
  d3.interval(() => {
    isRevenue = !isRevenue;
    updateChart(dataCsv);
  }, 1000);

  updateChart(dataCsv);
})();
