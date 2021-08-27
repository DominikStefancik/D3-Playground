class StackedAreaChart {
  constructor(parentElement, settings, data, continentNames) {
    this.parentElement = parentElement;
    this.data = data;
    this.continentNames = continentNames;
    this.continentKeys = Object.keys(this.continentNames);
    this.colours = {
      AF: "#F9EACF",
      NA: "#D1F7FF",
      OC: "#4690D0",
      AS: "#FFCC78",
      EU: "#AEFF62",
      SA: "#FC9E8F",
    };

    this.init(settings);
  }

  init(settings) {
    const { canvasWidth, canvasHeight, margin, labelFontSize, fontStyle } =
      settings;
    this.width = canvasWidth - margin.left - margin.right;
    this.height = canvasHeight - margin.top - margin.bottom;
    this.fontStyle = fontStyle;

    const svg = d3
      .select(this.parentElement)
      .append("svg")
      .attr("width", this.width + margin.left + margin.right)
      .attr("height", this.height + margin.top + margin.bottom);

    this.group = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    this.xScale = d3.scaleTime().range([0, this.width]);
    this.yScale = d3.scaleLinear().range([this.height, 0]);

    this.xAxisCall = d3.axisBottom().ticks(d3.timeYear.every(10));
    this.yAxisCall = d3.axisLeft();

    this.area = d3.area();
    this.stack = d3
      .stack()
      // we need to tell the stack function which keys are relevant from the whole data
      .keys(this.continentKeys)
      .order(d3.stackOrderDescending);

    this.initLegend();

    this.xAxis = this.group
      .append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0, ${this.height})`);
    this.yAxis = this.group.append("g").attr("class", "y axis");

    this.group
      .append("text")
      .text("Year")
      .attr("x", this.width / 2)
      .attr("y", this.height + 50)
      .attr("font-size", labelFontSize)
      .attr("font-family", this.fontStyle)
      .attr("text-anchor", "middle");

    this.group
      .append("text")
      .text("Population")
      .attr("x", -this.height / 2)
      .attr("y", -margin.left + 20)
      .attr("font-size", labelFontSize)
      .attr("font-family", this.fontStyle)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)");

    this.group.append("path").attr("class", "line");

    this.updateData();
  }

  initLegend() {
    const LABEL_CATEGORY_LENGTH = 150;
    const LABEL_SQUARE_LENGTH = 20;

    const legendGroup = this.group
      .append("g")
      .attr("width", this.width)
      .attr("height", 50)
      .attr("transform", "translate(0, -50)");

    const categoryGroup = legendGroup
      .selectAll(".category")
      .data(this.continentKeys)
      .enter()
      .append("g")
      .attr("class", "category")
      .attr("width", this.width / this.continentKeys.length)
      .attr("height", LABEL_SQUARE_LENGTH)
      .attr(
        "transform",
        (data, index) => `translate(${index * LABEL_CATEGORY_LENGTH}, 0)`
      );

    categoryGroup
      .append("rect")
      .attr("width", LABEL_SQUARE_LENGTH)
      .attr("height", LABEL_SQUARE_LENGTH)
      .attr("fill", (key) => this.colours[key]);

    categoryGroup
      .append("text")
      .text((key) => this.continentNames[key])
      .attr(
        "transform",
        `translate(${LABEL_SQUARE_LENGTH + 10}, ${LABEL_SQUARE_LENGTH - 5})`
      );
  }

  /**
   * Selects/filters the data we want to use
   */
  updateData() {
    // filter data from selected time period
    const filteredData = this.data.filter(
      (data) =>
        data.year >= parseTime(minYear) && data.year <= parseTime(maxYear)
    );

    this.update(filteredData);
  }

  update(filteredData) {
    // set the transition
    const transition = d3.transition().duration(3000);

    // set scale domains
    this.xScale.domain(d3.extent(filteredData, (data) => data.year));
    this.yScale.domain([
      0,
      d3.max(filteredData, (data) => data.world_population) * 1.005,
    ]);

    // generate axes once scales have been set
    this.xAxis
      .transition(transition)
      .call(this.xAxisCall.scale(this.xScale))
      .selectAll("text")
      .attr("font-family", this.fontStyle);
    this.yAxis
      .transition(transition)
      .call(this.yAxisCall.scale(this.yScale))
      .selectAll("text")
      .attr("font-family", this.fontStyle);

    this.area
      .x((layerData) => this.xScale(layerData.data.year))
      // the area generator we have to provide two vertical lines,
      // "y0" for the bottom of the area
      .y0((layerData) => this.yScale(layerData[0]))
      // "y1" for the top of the area
      .y1((layerData) => this.yScale(layerData[1]));

    this.layer = this.group.selectAll(".layer").data(this.stack(filteredData));

    this.layer
      .select("path")
      .attr("class", "area")
      .attr("fill", (data) => this.colours[data.key])
      .attr("d", this.area);

    this.layer = this.layer.enter().append("g").attr("class", "layer");

    this.layer
      .append("path")
      .attr("class", "area")
      .attr("fill", (data) => this.colours[data.key])
      .attr("d", this.area);
  }
}
