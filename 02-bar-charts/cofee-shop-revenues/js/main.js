const createLinearScale = (domainMax, rangeStart) => {
  return d3.scaleLinear().domain([0, domainMax]).range([rangeStart, 0]);
};

const createGroup = (canvas, group, groupName) => {
  return d3
    .select(`#${groupName}-area`)
    .append("svg")
    .attr("width", canvas.width)
    .attr("height", canvas.height)
    .attr("style", "border:1px solid black;")
    .append("g")
    .attr("transform", `translate(${group.x}, ${group.y})`);
};

const addAxisToBottom = (group, axis, yCoordinate) => {
  group
    .append("g")
    .attr("transform", `translate(0, ${yCoordinate})`)
    .call(axis);
};

const addAxisToLeft = (group, scale) => {
  const axis = d3.axisLeft(scale).tickFormat((data) => `$${data}`);

  group.append("g").call(axis);
};

const addLabelToBottom = (group, xCoordinate, yCoordinate) => {
  group
    .append("text")
    .text("Month")
    .attr("x", xCoordinate)
    .attr("y", yCoordinate)
    .attr("font-size", 15)
    .attr("font-family", "Comic Sans MS")
    .attr("text-anchor", "middle");
};

const addLabelToLeft = (label, group, xCoordinate, yCoordinate) => {
  group
    .append("text")
    .text(label)
    .attr("x", -xCoordinate)
    .attr("y", -yCoordinate)
    .attr("transform", "rotate(-90)")
    .attr("font-size", 15)
    .attr("font-family", "Comic Sans MS")
    .attr("text-anchor", "middle");
};

const addBars = (
  data,
  group,
  groupHeight,
  monthScale,
  yScale,
  colourScale,
  dataProperty
) => {
  const bars = group.selectAll("bars").data(data);

  bars
    .enter()
    .append("rect")
    .attr("x", (data) => monthScale(data.month))
    .attr("y", (data) => yScale(data[dataProperty]))
    .attr("width", monthScale.bandwidth())
    .attr("height", (data) => groupHeight - yScale(data[dataProperty]))
    .attr("fill", (data) => colourScale(data.month));
};

(async () => {
  const dataCsv = await d3.csv("data/revenues.csv");
  dataCsv.forEach((data) => {
    data.revenue = Number(data.revenue);
    data.profit = Number(data.profit);
  });

  const CANVAS_MARGIN = { left: 80, right: 10, top: 10, bottom: 60 };
  const GROUP_WIDTH = 600 - CANVAS_MARGIN.left - CANVAS_MARGIN.right;
  const GROUP_HEIGHT = 400 - CANVAS_MARGIN.top - CANVAS_MARGIN.bottom;
  const REVENUE_STRING = "revenue";
  const PROFIT_STRING = "profit";
  const BOTTOM_LABEL_Y = 45;
  const LEFT_LABEL_Y = 55;

  const canvas = {
    width: GROUP_WIDTH + CANVAS_MARGIN.left + CANVAS_MARGIN.right,
    height: GROUP_HEIGHT + CANVAS_MARGIN.top + CANVAS_MARGIN.bottom,
  };

  const group = {
    x: CANVAS_MARGIN.left,
    y: CANVAS_MARGIN.top,
    width: GROUP_WIDTH,
    height: GROUP_HEIGHT,
  };

  const monthScale = d3
    .scaleBand()
    .domain(dataCsv.map((data) => data.month))
    .range([0, GROUP_WIDTH])
    .paddingInner(0.2)
    .paddingOuter(0.2);

  const colourScale = d3
    .scaleOrdinal()
    .domain(dataCsv.map((data) => data.month))
    .range(d3.schemeTableau10);

  const monthAxis = d3.axisBottom(monthScale);

  // Revenue chart
  const revenueGroup = createGroup(canvas, group, REVENUE_STRING);
  addAxisToBottom(revenueGroup, monthAxis, GROUP_HEIGHT);
  addLabelToBottom(
    revenueGroup,
    GROUP_WIDTH / 2,
    GROUP_HEIGHT + BOTTOM_LABEL_Y
  );

  const revenueScale = createLinearScale(
    d3.max(dataCsv, (data) => data.revenue),
    GROUP_HEIGHT
  );
  addAxisToLeft(revenueGroup, revenueScale);
  addLabelToLeft("Revenue", revenueGroup, GROUP_HEIGHT / 2, LEFT_LABEL_Y);
  addBars(
    dataCsv,
    revenueGroup,
    GROUP_HEIGHT,
    monthScale,
    revenueScale,
    colourScale,
    REVENUE_STRING
  );

  // Profit chart
  const profitGroup = createGroup(canvas, group, PROFIT_STRING);
  addAxisToBottom(profitGroup, monthAxis, GROUP_HEIGHT);
  addLabelToBottom(profitGroup, GROUP_WIDTH / 2, GROUP_HEIGHT + BOTTOM_LABEL_Y);

  const profitScale = createLinearScale(
    d3.max(dataCsv, (data) => data.profit),
    GROUP_HEIGHT
  );
  addAxisToLeft(profitGroup, profitScale);
  addLabelToLeft("Profit", profitGroup, GROUP_HEIGHT / 2, LEFT_LABEL_Y);
  addBars(
    dataCsv,
    profitGroup,
    GROUP_HEIGHT,
    monthScale,
    profitScale,
    colourScale,
    PROFIT_STRING
  );
})();
