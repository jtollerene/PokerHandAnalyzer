// Dimensions of sunburst.
var width = 1200;
var height = 1200;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 75, h: 30, s: 3, t: 10
};

// Mapping of step names to colors.
var colors = {
  "hr": "firebrick",
  "hc": "steelblue",
  "hf": "MediumSeaGreen",
  "vr": "red",
  "vc": "royalblue",
  "vf": "green",
  "flop": "black",
  "turn": "black",
  "river": "black"
};

// Basic setup of page elements.
initializeBreadcrumbTrail();
drawLegend();
d3.select("#togglelegend").on("click", toggleLegend);

function hero() {
  return $('#hero').val();
}

//populate the opponent dropdown
function loadOpponents() {
  $('#opponent').empty();
  $.getJSON('opponents', { hero: hero() }, function(data) {
    _.each(data, function(el) {
      $('#opponent').append('<option>' + el +'</option>');
    })
    //draw the initial chart
    visualize();
  });  
}

loadOpponents();

//populate the games dropdown
$.getJSON('games', function(data) {
  _.each(data, function(el) {
    $('#game').append('<option>' + el +'</option>');
  })
})
//populate the stakes dropdown
$.getJSON('stakes', function(data) {
  _.each(data, function(el) {
    $('#stakes').append('<option>' + el +'</option>');
  })
})

//attach event handlers to ui
$('#inputs select, #inputs input').change(visualize);
/*$('#uploadForm').submit(function(e){
  var formData = new FormData($(this));
  $.post($(this).attr("action"), formData, function(res){
      console.log(res);
    });
  return false;
  //$.post('/upload', e.target.files);
});*/
$('#hero').change(loadOpponents);

function visualize(e) {
  var pos = $('#position').val(),
      opponent = $('#opponent').val(),
      game = $('#game').val(),
      stakes = $('#stakes').val(),
      from = $('#from').val(),
      to = $('#to').val();

  //first remove the old chart
  $('#chart svg').remove();
  //draw the new chart
  //draw(pos);
  draw(hero(), pos, opponent, game, stakes, from, to);
  //set the proper title
  $('#title').text(pos);
}

function draw(hero, position, opponent, game, stakes, from, to) {
  // Total size of all segments; we set this later, after loading the data.
  var totalSize = 0; 

  var vis = d3.select("#chart").append("svg:svg")
      .attr("width", width)
      .attr("height", height)
      .append("svg:g")
      .attr("class", "container")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  /*var vis_bb = d3.select("#chart2").append("svg:svg")
      .attr("width", width)
      .attr("height", height)
      .append("svg:g")
      .attr("class", "container")
      .attr("transform", "translate(" + width / 1.95 + "," + height / 2 + ")");*/

  var partition = d3.layout.partition()
      .size([2 * Math.PI, radius * radius])
      .value(function(d) { return d.size; });

  var arc = d3.svg.arc()
      .startAngle(function(d) { return d.x; })
      .endAngle(function(d) { return d.x + d.dx; })
      .innerRadius(function(d) { return Math.sqrt(d.y); })
      .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

  // Use d3.text and d3.csv.parseRows so that we do not need to have a header
  // row, and can receive the csv as an array of arrays.
  /*d3.text(fileName, function(text) {
    var csv = d3.csv.parseRows(text);
    var json = buildHierarchy(csv);
    createVisualization(json);
  });*/

  d3.json('/data?pos=' + 
    position.concat('&hero=', hero, '&villain=', opponent, '&game=', game, 
      '&stakes=', stakes, '&from=', from, '&to=', to), 
    function(err, data) {
      var json = buildHierarchy(data);
      createVisualization(json);
      //console.log(data);
  });

  // Main function to draw and set up the visualization, once we have the data.
  function createVisualization(json) {
    // Bounding circle underneath the sunburst, to make it easier to detect
    // when the mouse leaves the parent g.
    vis.append("svg:circle")
        .attr("r", radius)
        .style("opacity", 0);

    // For efficiency, filter nodes to keep only those large enough to see.
    var nodes = partition.nodes(json)
        .filter(function(d) {
        return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
        });

    var path = vis.data([json]).selectAll("path")
        .data(nodes)
        .enter().append("svg:path")
        .attr("display", function(d) { return d.depth ? null : "none"; })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("fill", function(d) { return colors[d.name]; })
        .style("opacity", 1)
        .on("mouseover", mouseover)
        .on("click", onClick);

    // Add the mouseleave handler to the bounding circle.
    d3.select(".container").on("mouseleave", mouseleave);

    // Get total size of the tree = value of root node from partition.
    totalSize = path.node().__data__.value;
   };

   function onClick(e) {
    var seq = _.reduce($('#sequence text:not(#endlabel)'), function(memo, el, i) {
      if (i !== 0) memo += '-'
      return memo += $(el).text();
    }, '');
    console.log(seq);
   }

  /*function createVisualizationBB(json) {
    // Bounding circle underneath the sunburst, to make it easier to detect
    // when the mouse leaves the parent g.
    vis_bb.append("svg:circle")
        .attr("r", radius)
        .style("opacity", 0);

    // For efficiency, filter nodes to keep only those large enough to see.
    var nodes = partition.nodes(json)
        .filter(function(d) {
        return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
        });

    var path = vis_bb.data([json]).selectAll("#chart2 path")
        .data(nodes)
        .enter().append("svg:path")
        .attr("display", function(d) { return d.depth ? null : "none"; })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("fill", function(d) { return colors[d.name]; })
        .style("opacity", 1)
        .on("mouseover", mouseoverBB);

    // Add the mouseleave handler to the bounding circle.
    //d3.select("#chart2 .container").on("mouseleave", mouseleave);

    // Get total size of the tree = value of root node from partition.
    totalSize = path.node().__data__.value;
   };*/

  // Fade all but the current sequence, and show it in the breadcrumb trail.
  function mouseover(d) {

    var outcomes = d.parent.children,
        numOutcomes = outcomes.length,
        sampleSize = 0;

    for (var i = 0; i < numOutcomes; i++) {
      sampleSize += outcomes[i].value;
    }

    //var percentage = (100 * d.value / totalSize).toPrecision(3);
    var percentage = (100 * d.value / sampleSize).toPrecision(3);
    var percentageString = percentage + "%   (" + d.value + '/' + sampleSize + ')';
    if (percentage < 0.1) {
      percentageString = "< 0.1%";
    }

    d3.select("#percentage")
        .text(percentageString);

    d3.select("#explanation")
        .style("visibility", "");

    var sequenceArray = getAncestors(d);
    updateBreadcrumbs(sequenceArray, percentageString);

    // Fade all the segments.
    d3.selectAll("path")
        .style("opacity", 0.3);

    // Then highlight only those that are an ancestor of the current segment.
    d3.selectAll("path")
        .filter(function(node) {
                  return (sequenceArray.indexOf(node) >= 0);
                })
        .style("opacity", 1);
  }

  /*function mouseoverBB(d) {

    var outcomes = d.parent.children,
        numOutcomes = outcomes.length,
        sampleSize = 0;

    for (var i = 0; i < numOutcomes; i++) {
      sampleSize += outcomes[i].value;
    }

    //var percentage = (100 * d.value / totalSize).toPrecision(3);
    var percentage = (100 * d.value / sampleSize).toPrecision(3);
    var percentageString = percentage + "%   (" + d.value + '/' + sampleSize + ')';
    if (percentage < 0.1) {
      percentageString = "< 0.1%";
    }

    d3.select("#percentage2")
        .text(percentageString);

    d3.select("#explanation2")
        .style("visibility", "");

    var sequenceArray = getAncestors(d);
    updateBreadcrumbs(sequenceArray, percentageString);

    // Fade all the segments.
    d3.selectAll("path")
        .style("opacity", 0.3);

    // Then highlight only those that are an ancestor of the current segment.
    d3.selectAll("#chart2 path")
        .filter(function(node) {
                  return (sequenceArray.indexOf(node) >= 0);
                })
        .style("opacity", 1);
  }*/

  // Restore everything to full opacity when moving off the visualization.
  function mouseleave(d) {

    // Hide the breadcrumb trail
    d3.select("#trail")
        .style("visibility", "hidden");

    // Deactivate all segments during transition.
    d3.selectAll("path").on("mouseover", null);

    // Transition each segment to full opacity and then reactivate it.
    d3.selectAll("#chart path")
        .transition()
        .duration(100)
        .style("opacity", 1)
        .each("end", function() {
                d3.select(this).on("mouseover", mouseover);
              });

    /*d3.selectAll("#chart2 path")
        .transition()
        .duration(100)
        .style("opacity", 1)
        .each("end", function() {
                d3.select(this).on("mouseover", mouseoverBB);
              });*/

    d3.select("#explanation")
        .transition()
        .duration(100)
        .style("visibility", "hidden");

    /*d3.select("#explanation2")
        .transition()
        .duration(100)
        .style("visibility", "hidden");*/
  }

  // Given a node in a partition layout, return an array of all of its ancestor
  // nodes, highest first, but excluding the root.
  function getAncestors(node) {
    var path = [];
    var current = node;
    while (current.parent) {
      path.unshift(current);
      current = current.parent;
    }
    return path;
  }

  // Generate a string that describes the points of a breadcrumb polygon.
  function breadcrumbPoints(d, i) {
    var points = [];
    points.push("0,0");
    points.push(b.w + ",0");
    points.push(b.w + b.t + "," + (b.h / 2));
    points.push(b.w + "," + b.h);
    points.push("0," + b.h);
    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
      points.push(b.t + "," + (b.h / 2));
    }
    return points.join(" ");
  }

  // Update the breadcrumb trail to show the current sequence and percentage.
  function updateBreadcrumbs(nodeArray, percentageString) {

    // Data join; key function combines name and depth (= position in sequence).
    var g = d3.select("#trail")
        .selectAll("g")
        .data(nodeArray, function(d) { return d.name + d.depth; });

    // Add breadcrumb and label for entering nodes.
    var entering = g.enter().append("svg:g");

    entering.append("svg:polygon")
        .attr("points", breadcrumbPoints)
        .style("fill", function(d) { return colors[d.name]; });

    entering.append("svg:text")
        .attr("x", (b.w + b.t) / 2)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.name; });

    // Set position for entering and updating nodes.
    g.attr("transform", function(d, i) {
      return "translate(" + i * (b.w + b.s) + ", 0)";
    });

    // Remove exiting nodes.
    g.exit().remove();

    // Now move and update the percentage at the end.
    d3.select("#trail").select("#endlabel")
        .attr("x", (nodeArray.length + 0.75) * (b.w + b.s))
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(percentageString);

    // Make the breadcrumb trail visible, if it's hidden.
    d3.select("#trail")
        .style("visibility", "");

  }

    // Take a 2-column CSV and transform it into a hierarchical structure
    //suitable for a partition layout. The first column is a sequence of
    //step names, from root to leaf, separated by hyphens. The second column
    //is a count of how often that sequence occurred.
    function buildHierarchy(hands) {
        var root = {"name": "root", "children": []};
        //for (var i = 0; i < hands.length; i++) {
          var z = 0;
        for (var seq in hands) {
            var sequence = seq;
            var size = hands[seq];
            //var h = hands[i],
                //sequence = h.sequence,
                //size = h.count;
            if (isNaN(size)) { // e.g. if this is a header row
                continue;
            }
            var parts = sequence.split("-");
            var currentNode = root;
            for (var j = 0; j < parts.length; j++) {
                //if we are looking at a leaf node of a previous sequence,
                //there will be no children, and will handle that 
                //scenario by defaulting to an empty array
                //var children = currentNode["children"] || [];
                var children = currentNode["children"] || (function(){
                  console.log(++z)
                  console.log(sequence, 'is a child of another sequence.');
                  return [];
                }());
                var nodeName = parts[j];
                var childNode;
                if (j + 1 < parts.length) {
                    // Not yet at the end of the sequence; move down the tree.
                   	var foundChild = false;
                    for (var k = 0; k < children.length; k++) {
                        if (children[k]["name"] == nodeName) {
                            childNode = children[k];
                            foundChild = true;
                            break;
                        }
                    }
                    // If we don't already have a child node for this branch,
                    //create it.
                   	if (!foundChild) {
                   	  childNode = {"name": nodeName, "children": []};
                   	  children.push(childNode);
                   	}
                   	currentNode = childNode;
                } else {
                   	// Reached the end of the sequence; create a leaf node.
                   	childNode = {"name": nodeName, "size": size};
                    //if (children === undefined) debugger;
                   	children.push(childNode);
                }
            }
        }
        return root;
    };
}

function initializeBreadcrumbTrail() {
  // Add the svg area.
  var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", '100%')
      .attr("height", 50)
      .attr("id", "trail");
  // Add the label at the end, for the percentage.
  trail.append("svg:text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rect.
  var li = {
    w: 75, h: 30, s: 3, r: 3
  };

  var legend = d3.select("#legend").append("svg:svg")
      //.attr("width", li.w)
      .attr("width", d3.keys(colors).length * (li.w + li.s))
      .attr("height", li.h);
      //.attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
      .data(d3.entries(colors))
      .enter().append("svg:g")
      .attr("transform", function(d, i) {
              //return "translate(0," + i * (li.h + li.s) + ")";
              return "translate(" + i * (li.w + li.s) + ",0)";
           });

  g.append("svg:rect")
      .attr("rx", li.r)
      .attr("ry", li.r)
      .attr("width", li.w)
      .attr("height", li.h)
      .style("fill", function(d) { return d.value; });

  g.append("svg:text")
      .attr("x", li.w / 2)
      .attr("y", li.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.key; });
}

function toggleLegend() {
  var legend = d3.select("#legend");
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "");
  } else {
    legend.style("visibility", "hidden");
  }
}