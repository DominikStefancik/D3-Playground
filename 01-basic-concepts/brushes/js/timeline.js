/*
 *  Class responsible for rendering a context chart with a brush. It renders an area chart and has similar methods as the class
 *  for creating the main chart, i.e. methods for setting the static parts, updating the data according to the user interaction and
 *  updating the chart itself according to the updated data.
 *  The brush is created in the context of the area chart and can be moved and resized. The data covered with the brush will be
 *  shown in details in the main line chart.
 */

class Timeline {
  constructor(parentElement, settings, data, coin) {
    this.parentElement = parentElement;
    this.data = data;
    this.coin = coin;

    this.init(settings);
  }

  setCoin(coin) {
    this.coin = coin;
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

    this.xAxisCall = d3.axisBottom().ticks(d3.timeMonth.every(6));

    this.xAxis = this.group
      .append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0, ${this.height})`);

    this.areaPath = this.group
      .append("path")
      .attr("class", "timeline")
      .attr("fill", "#ccc");

    // the brush generator which will be one-dimensional and will only move in the x-direction
    // creating a brush has 3 steps:
    // 1. Initialise "brush" generator with some properties
    // 2. Call the brush in the context of the visualisation
    // 3. Create an event handler for the "brush" event to make updates based on the position of the brush
    this.brush = d3
      .brushX()
      .handleSize(10)
      // "extent" defines minimum and maximum coordinates an overlay the brush will be able to move between
      .extent([
        [0, 0],
        [this.width, this.height],
      ])
      .on("brush", (event) => brushMoveHadler(event));

    // call the brush in the context of the visualisation
    this.brushComponent = this.group
      // we create an empty group
      .append("g")
      .attr("class", "brush")
      // and then we call the "brush" function on it
      // D3 then creates additionnal elements as overlay, selection and handles which we can use for
      // moving and resizing the brush
      .call(this.brush);

    this.updateData();
  }

  /**
   * Selects/filters the data we want to use
   */
  updateData() {
    this.update();
  }

  /**
   * Updates the timeline according to the user's selection
   */
  update() {
    const transition = d3.transition().duration(3000);
    const varSelectValue = $("#var-select").val();
    const coinData = this.data[this.coin];

    // update scales
    this.xScale.domain(d3.extent(coinData, (data) => data.date));
    this.yScale.domain([
      d3.min(coinData, (data) => data[varSelectValue]) / 1.005,
      d3.max(coinData, (data) => data[varSelectValue]) * 1.005,
    ]);

    // update axis
    this.xAxis.transition(transition).call(this.xAxisCall.scale(this.xScale));

    const area = d3
      .area()
      .x((data) => this.xScale(data.date))
      .y0(this.height)
      .y1((data) => this.yScale(data[varSelectValue]));

    // we don't update x-axis when we update the time range
    // the timeline chart will always show data from all dates
    this.areaPath.data([coinData]).transition(transition).attr("d", area);
  }
}
