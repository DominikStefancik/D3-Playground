class Timeline {
  constructor(parentElement, settings, data, continentNames) {
    this.parentElement = parentElement;
    this.data = data;
    this.continentKeys = Object.keys(continentNames);

    this.init(settings);
  }

  /**
   * Sets up static parts of the timeline (chart dimensions, margins, fonts, labels, ...)
   */
  init(settings) {
    const { canvasWidth, canvasHeight, margin } = settings;
    this.width = canvasWidth - margin.left - margin.right;
    this.height = canvasHeight - margin.top - margin.bottom;

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

    this.xAxis = this.group
      .append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0, ${this.height})`);

    this.areaPath = this.group
      .append("path")
      .attr("class", "timeline")
      .attr("fill", "#ccc");

    this.area = d3
      .area()
      .x((layerData) => this.xScale(layerData.data.year))
      .y0((layerData) => this.yScale(layerData[0]))
      .y1((layerData) => this.yScale(layerData[1]));

    this.stack = d3
      .stack()
      // we need to tell the stack function which keys are relevant from the whole data
      .keys(this.continentKeys)
      .order(d3.stackOrderDescending);

    this.brush = d3
      .brushX()
      .handleSize(10)
      .extent([
        [0, 0],
        [this.width, this.height],
      ])
      .on("brush", (event) => brushMoveHadler(event));

    this.update();
  }

  update() {
    const transition = d3.transition().duration(3000);

    // update scales
    this.xScale.domain(d3.extent(this.data, (data) => data.year));
    this.yScale.domain([
      0,
      d3.max(this.data, (data) => data.world_population) * 1.005,
    ]);

    // update axis
    this.xAxis.transition(transition).call(this.xAxisCall.scale(this.xScale));

    this.layer = this.group
      .selectAll(".timeline-layer")
      .data(this.stack(this.data))
      .enter()
      .append("g")
      .attr("class", "timeline-layer");

    this.layer
      .append("path")
      .attr("class", "area")
      .attr("fill", "#EAEAEA")
      .attr("stroke", "#555555")
      .attr("strokewidth", "1px")
      .attr("d", this.area);

    // call the brush in the context of the visualisation
    this.brushComponent = this.group
      .append("g")
      .attr("class", "brush")
      .call(this.brush);
  }
}
