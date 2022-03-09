class CircleChart{
  dividends = false;
  constructor(container, data){
    this.container = container;
    this._data = data;
    this._data = {name: 'chart', children: this._data};
  }
  init = () => {
    d3.select(this.container)
      .html("");
    d3.select(this.container)
      .append("div")
        .classed("button-div d-flex justify-content-center", true);
    d3.select(this.container)
      .append("div")
        .style("position", "relative")
        .classed("svg-div", true);
    this.svg = d3.select(this.container)
                  .select(".svg-div")
                  .append("svg")
                  .style("background-color", "#f0f0f0");
    this.update();
    this.initButtons();
    this.initCirclechart();
    this.updateCirclechart();
  }
  update = () => {
    this.width = parseInt(this.container.clientWidth);
		this.height = parseInt(this.container.clientHeight)*0.9;
    this.button_height = parseInt(this.container.clientHeight)*0.1;
    d3.select(".svg-div")
      .attr("height", this.height)
      .attr("width", this.width);
    d3.select(".button-div")
      .attr("height", this.button_height)
      .attr("width", this.width);
    this.svg
      .attr("height", this.height)
      .attr("width", this.width);
  }
  initButtons = () => {
    d3.select(this.container)
      .select(".button-div")
      .append("div")
        .classed("form-check form-switch", true)
        .append("input")
    	    .attr("type", "checkbox")
          .classed("form-check-input", true)
          .attr("name", "dividend_checkbox")
    			.on("click", () => {this.dividends = !this.dividends; this.initCirclechart(); this.updateCirclechart();});
    d3.select(this.container)
      .select(".button-div")
      .select(".form-check")
      .append("label")
  	    .attr("for", "dividend_checkbox")
        .classed("form-check-label", true)
        .attr("font-size", "16px")
        .html("Dywidendy");
  }
  initCirclechart = () => {
    this.svg.selectAll("*").remove();
    if(this.dividends) {
      this._data.children.forEach((item, i) => {
        item.zysk_suma = parseFloat(item.zysk) + parseFloat(item.dywidenda_zysk);
      });
    } else {
      this._data.children.forEach((item, i) => {
        item.zysk_suma = item.zysk;
      });
    }
    const scaleCircle = d3.scaleLinear()
                    .domain([d3.min(this._data.children, d => Math.abs(parseInt(d.zysk_suma))),d3.max(this._data.children, d => Math.abs(parseInt(d.zysk_suma)))])
                    .range([20, 100]);
    const g = this.svg.append("g");
    this.node = g.selectAll("circle")
                   .data(this._data.children)
                   .enter()
                   .append("circle")
                    .attr("r", d => scaleCircle(Math.abs(parseInt(d.zysk_suma))))
                    .attr("cx", this.width / 2)
                    .attr("cy", this.height / 2)
                    .style("fill-opacity", 0.5)
                    .style("stroke-width", 3)
                    .classed("circle-node", true)
                    .call(d3.drag()
                            .on("start", d => {
                              if (!d.target.active)
                                this.simulation.alphaTarget(0.01).restart();
                              d.subject.x = d.x;
                              d.subject.y = d.y;
                            })
                            .on("drag", d => {
                              tooltip
                                .style("opacity", "0")
                                .attr("width", 0);
                              tooltiptext
                                .attr("display", "none");
                              d.subject.x = d.x;
                              d.subject.y = d.y;
                            })
                            .on("end", d => {
                              if (!d.target.active)
                                this.simulation.alphaTarget(0.3);
                            }));
    this.node.filter(d => d.zysk_suma >= 0)
        .attr("stroke", "#66a2b3")
        .style("fill", "#66a3b2");
    this.node.filter(d => d.zysk_suma < 0)
        .attr("stroke", "#f44f27")
        .style("fill", "#f44a26");

    const node_text = g.selectAll("text")
                        .data(this._data.children)
                        .enter()
                        .append("text")
                          .text(d => d.spolka)
                          .attr("font-family", "monospace")
                          .attr("pointer-events", "none")
                          .style("user-select", "none")
                          .attr("text-anchor", "middle")
                          .attr("font-size", (d) => {
                              let cut_text = scaleCircle(Math.abs(d.zysk_suma))*2 / d.spolka.length;
                              if(cut_text*1.4 > 26)
                                cut_text = 24;
                              return String(cut_text*1.4) + "px";
                          })
                          .attr("fill", "black");
    this.simulation = d3.forceSimulation()
                         .force("manyBody", d3.forceManyBody().strength(50))
                         .force("collide", d3.forceCollide().strength(.6).radius( d => scaleCircle(Math.abs(parseInt(d.zysk_suma)))+2).iterations(1))
                         .alpha(0.03)
                         .restart();
    this.simulation.nodes(this._data.children)
               .on("tick", () => {
                 this.node
                     .attr("cx", d => d.x)
                     .attr("cy", d => d.y);
                 node_text
                     .attr("x", d => d.x)
                     .attr("y", d => d.y + scaleCircle(Math.abs(d.zysk_suma)) / 10);
               });
    // Dodanie tooltipa pokazującego wartość słupka po najechaniu
  	const tooltip = this.svg.append("rect")
  						.attr("width", "0px")
  						.attr("height", "0px")
              .attr("rx", "20px")
              .attr("ry", "20px")
              .attr("pointer-events", "none")
  						.style("fill", "white")
  						.style("stroke", "black")
  						.classed("tooltip", true)
  	const tooltiptext = this.svg.append("text")
              .attr("pointer-events", "none")
              .style("user-select", "none")
              .attr("text-anchor", "middle")
  						.classed("tooltip-text", true);
    //Obsługa eventów tooltipa
  	this.svg.selectAll('circle')
  			.on("mousemove", (ev, d) => {
          let text = String(d.spolka + " " + parseFloat(d.zysk_suma).toFixed(2));
          let tooltipsize = [text.length*12, 40];
  				let tooltippos = [d3.pointer(ev)[0]- tooltipsize[0]/2, d3.pointer(ev)[1]-tooltipsize[1]-10];

          tooltip
            .attr("x", tooltippos[0])
    			  .attr("y", tooltippos[1])
    			  .attr("width", tooltipsize[0])
    			  .attr("height", tooltipsize[1])
            .style("opacity", "0.8");

  			  tooltiptext
    				.attr("x", tooltippos[0] + tooltipsize[0]/2)
    				.attr("y", (tooltippos[1]+5) + tooltipsize[1]/2)
    				.attr("display", "inherit")
    				.text(text);
  			})
  			.on("mouseout", function(ev){
  				tooltip
  					.style("opacity", "0")
            .attr("width", 0);
  				tooltiptext
  					.attr("display", "none");
  			});
  }
  updateCirclechart = () => {
    this.simulation.force("center", d3.forceCenter().strength(1).x(this.width / 2).y(this.height / 2))
                   .alpha(0.3)
                   .restart();
    this.node.attr("cx", this.width / 2)
             .attr("cy", this.height / 2);
  }
  refresh = () => {
    this.update();
    this.updateCirclechart();
  }
}
