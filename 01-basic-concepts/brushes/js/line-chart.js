/*
 *  Class responsible for rendering the data visualisation. It has methods for setting
 *  static parts of the visualisation (the parts which need to be set only once, e.g. scales, axes, labels, ...),
 *  for updating the data according to the user interaction and updating the chart itself according to the updated data.
 *  The method for updating data is called from the main controller to trigger updating the chart.
 *
 *  The flow steps are:
 *  Initialise visualisation -> Update data -> Update chart
 */

/**
 * Represents a visualisation as a Line Chart
 */
class LineChart {
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
   * Sets up static parts of the visualisation (chart dimensions, margins, fonts, labels, ...)
   */
  init(settings) {
    const { canvasWidth, canvasHeight, margin, labelFontSize, fontStyle } =
      settings;
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

    // helper function for formatting ticks on y-axis
    const formatSi = d3.format(".2s");
    const formatAbbreviation = (data) => {
      const string = formatSi(data);
      switch (string[string.length - 1]) {
        case "G":
          return string.slice(0, -1) + "B";
        case "k":
          return string.slice(0, -1) + "K";
      }
      return string;
    };

    this.xAxisCall = d3.axisBottom().ticks(d3.timeMonth.every(6));
    this.yAxisCall = d3
      .axisLeft()
      .ticks(6)
      .tickFormat((data) => formatAbbreviation(data));

    this.line = d3.line();

    this.xAxis = this.group
      .append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0, ${this.height})`);
    this.yAxis = this.group.append("g").attr("class", "y axis");

    this.yAxis
      .append("text")
      .text("Population")
      .attr("class", "axis-title")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .attr("fill", "#5D6971");

    this.group
      .append("text")
      .text("Time")
      .attr("x", this.width / 2)
      .attr("y", this.height + 50)
      .attr("font-size", labelFontSize)
      .attr("font-family", fontStyle)
      .attr("text-anchor", "middle");

    this.outerLabel = this.group
      .append("text")
      .attr("x", -this.height / 2)
      .attr("y", -margin.left + 20)
      .attr("font-size", labelFontSize)
      .attr("font-family", fontStyle)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)");

    this.group.append("path").attr("class", "line");

    this.updateData();
  }

  /**
   * Selects/filters the data we want to use
   */
  updateData() {
    const coinData = this.data[this.coin];

    // filter data from selected time period
    const filteredData = coinData.filter(
      (data) => data.date >= minDate && data.date <= maxDate
    );

    this.update(filteredData);
  }

  /**
   * Updates the visualisation according to the new data
   */
  update(filteredData) {
    const varSelectValue = $("#var-select").val();

    this.xScale.domain([minDate, maxDate]);
    this.yScale.domain([
      d3.min(filteredData, (data) => data[varSelectValue]) / 1.005,
      d3.max(filteredData, (data) => data[varSelectValue]) * 1.005,
    ]);

    const transition = d3.transition().duration(3000);

    this.xAxis.transition(transition).call(this.xAxisCall.scale(this.xScale));
    this.yAxis.transition(transition).call(this.yAxisCall.scale(this.yScale));

    this.line
      .x((data) => this.xScale(data.date))
      .y((data) => this.yScale(data[varSelectValue]));

    d3.selectAll(".line")
      .transition(transition)
      .attr("d", this.line(filteredData));

    createTooltip({
      parentGroup: this.group,
      data: filteredData,
      yParameter: varSelectValue,
      height: this.height,
      width: this.width,
      xScale: this.xScale,
      yScale: this.yScale,
    });

    this.outerLabel.text($("#var-select option:selected").text() + " ($)");
  }
}
