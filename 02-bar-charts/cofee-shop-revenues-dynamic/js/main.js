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

const xScale = d3
  .scaleBand()
  .range([0, GROUP_WIDTH])
  .paddingInner(0.2)
  .paddingOuter(0.2);

const yScale = d3.scaleLinear().range([GROUP_HEIGHT, 0]);

const colourScale = d3
  .scaleOrdinal()
  .range(d3.schemeTableau10);

const xAxisCall = d3.axisBottom(xScale);

const yAxisCall = d3.axisLeft(yScale).tickFormat((data) => `$${data}`);

const xAxisGroup = group
  .append("g")
  .attr("transform", `translate(0, ${GROUP_HEIGHT})`)

const yAxisGroup = group.append("g");

group.append("text")
  .text("Month")
  .attr("x", GROUP_WIDTH / 2)
  .attr("y", GROUP_HEIGHT + 45)
  .attr("font-size", 15)
  .attr("font-family", "Comic Sans MS")
  .attr("text-anchor", "middle"); 

const yLabel = group
  .append("text")
  .attr("x", -GROUP_HEIGHT / 2)
  .attr("y", -55)
  .attr("transform", "rotate(-90)")
  .attr("font-size", 15)
  .attr("font-family", "Comic Sans MS")
  .attr("text-anchor", "middle");

const updateChart = (data) => {
  const property = isRevenue ? "revenue" : "profit";

  const transition =  d3.transition().duration(750);

  xScale.domain(data.map((dataItem) => dataItem.month));
  yScale.domain([0, d3.max(data, (dataItem) => dataItem[property])]);
  colourScale.domain(data.map((dataItem) => dataItem.month));

  xAxisGroup
    .transition(transition)
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

  const bars = group.selectAll("rect")
    // the function is optional second argument which will ensure that the rendered SVG elements will be associated 
    // with the right items in the array rather than to their index in the array (which is done by default)
    .data(data, (dataItem) => dataItem.month);

  bars.exit()
    .transition(transition)
      .attr("y", yScale(0))
      .attr("height", 0)
      .remove();

  bars
    .enter()
    .append("rect")
    .attr("fill", (data) => colourScale(data.month))
    .attr("y", yScale(0))
    .attr("height", 0)
    // "merge" method sets attributes of UPDATE and ENTER selections at the same time
    // we have to pass the selection we want to merge it with
    // all the attributes set BEFORE calling "merge" are applied only to the ENTER selection
    .merge(bars)
    // all the attributes set AFTER calling "merge" are applied to both ENTER and UPDATE selections
    .transition(transition)
      .attr("x", (data) => xScale(data.month))
      .attr("width", xScale.bandwidth())
      .attr("y", (data) => yScale(data[property]))
      .attr("height", (data) => GROUP_HEIGHT - yScale(data[property]))
};


(async () => {
  const dataCsv = await d3.csv("data/revenues.csv");
  dataCsv.forEach((data) => {
    data.revenue = Number(data.revenue);
    data.profit = Number(data.profit);
  });

  d3.interval(() => {
    isRevenue = !isRevenue;
    const newData = isRevenue ? dataCsv : dataCsv.slice(1);
    updateChart(newData);
  }, 1000);

  updateChart(dataCsv);
})();
