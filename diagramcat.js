var lorem_wordlist = [
  "ante",
  "condimentum",
  "fringilla",
  "habitasse",
  "hac",
  "imperdiet",
  "laoreet",
  "luctus",
  "maecenas",
  "mus",
  "nam",
  "non",
  "placerat",
  "pulvinar",
  "venenatis",
  "accumsan",
  "adipiscing",
  "aliquam",
  "aliquet",
  "amet",
  "aptent",
  "arcu",
  "auctor",
  "bibendum",
  "blandit",
  "commodo",
  "congue",
  "consectetur",
  "consequat",
  "conubia",
  "convallis",
  "cras",
  "cubilia",
  "curabitur",
  "curae",
  "cursus",
  "dapibus",
  "diam",
  "dictum",
  "dictumst",
  "dignissim",
  "dis",
  "dolor",
  "donec",
  "dui",
  "duis",
  "egestas",
  "eget",
  "eleifend",
  "elementum",
  "elit",
  "enim",
  "erat",
  "eros",
  "est",
  "etiam",
  "euismod",
  "facilisi",
  "facilisis",
  "fames",
  "faucibus",
  "felis",
  "fermentum",
  "feugiat",
  "gravida",
  "hendrerit",
  "himenaeos",
  "iaculis",
  "inceptos",
  "integer",
  "interdum",
  "ipsum",
  "justo",
  "lacinia",
  "lacus",
  "lectus",
  "leo",
  "libero",
  "ligula",
  "litora",
  "lobortis",
  "lorem",
  "magna",
  "malesuada",
  "massa",
  "mattis",
  "mauris",
  "metus",
  "mollis",
  "montes",
  "nascetur",
  "natoque",
  "nec",
  "neque",
  "netus",
  "nibh",
  "nisi",
  "nisl",
  "nostra",
  "nulla",
  "nullam",
  "nunc",
  "odio",
  "orci",
  "ornare",
  "parturient",
  "pellentesque",
  "penatibus",
  "per",
  "pharetra",
  "phasellus",
  "platea",
  "porta",
  "porttitor",
  "posuere",
  "potenti",
  "praesent",
  "pretium",
  "proin",
  "purus",
  "quam",
  "quis",
  "quisque",
  "rhoncus",
  "ridiculus",
  "risus",
  "rutrum",
  "sagittis",
  "sapien",
  "scelerisque",
  "sed",
  "sem",
  "semper",
  "senectus",
  "sit",
  "sociis",
  "sociosqu",
  "sodales",
  "sollicitudin",
  "suscipit",
  "suspendisse",
  "taciti",
  "tellus",
  "tempor",
  "tempus",
  "tincidunt",
  "torquent",
  "tortor",
  "tristique",
  "turpis",
  "ullamcorper",
  "ultrices",
  "ultricies",
  "urna",
  "varius",
  "vehicula",
  "velit",
  "vestibulum",
  "vitae",
  "vivamus",
  "viverra",
  "volutpat",
  "vulputate"
];

var blocks = [];

var mouseDown = null;

var mouseUp = null;

var regex = {
  valid: /(?:^\d+ -->\| .* \| \d+$)|(?:^\d+\[[\w <>?!]+\]$)|(?:^graph (?:TD|LR)$)|(?:classDef \w+ .+$)|(?:^class .+ \w+$)/gm,
  header: /^graph (?:TD|LR)/g,
  block: /^(\d+)(\[)(.+)(\])$/gm,
  blockEmpty: /^(\d+\[)(?=\]$)/gm,
  blockIndex: /^\d+(?=\[.*\]$)/gm,
  arrow: /^(\d+)( -->\| )(.*)( \| )(\d+)$/gm,
  allArrows: /(?:\d+ -->\| .* \| \d+\n*)+/g,
  allBlocks: /(?:\d+\[.+\]\n*)+/g,
  classDef: /^(classDef )(\w+)( )(.+)$/gm,
  classAssign: /^(class )(.+)( )(\w+)$/gm
};

var colors = ["green", "blue", "red", "orange"];
var defaultColor = "orange";

document.addEventListener("DOMContentLoaded", evt => {
  // Reset mermaid et al
  document.getElementById("mermaid_syntax_div").value = "";
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    flowchart: { curve: "linear" }
  });

  var h = document.documentElement.clientHeight - 50;
  document.getElementsByClassName("split-container")[0].style.height = h + "px";

  Split(["#left_split", "#right_split"], {
    sizes: [70, 30],
    minSize: 200
  });
});

document.addEventListener("dblclick", evt => {
  if (
    evt.target.localName == "body" ||
    evt.target.localName == "p" ||
    evt.target.localName == "svg" ||
    (evt.target.localName == "div" && evt.target.parentNode.localName == "div")
  ) {
    blocks.push({
      i: blocks.length,
      s: getRandomPhrase(lorem_wordlist, Math.floor(Math.random() * 3) + 1),
      to: [],
      color: defaultColor
    });

    var mermaid_syntax = getMermaidSyntax(blocks);
    updateMermaidSVG(mermaid_syntax);
    updateMermaidSyntaxText(mermaid_syntax);
  }
});

document.getElementById("mermaid_syntax_div").addEventListener("input", evt => {
  var textArea = document.getElementById("mermaid_syntax_div");
  var mermaid_syntax = sanitizeMermaidSyntax(textArea.value);

  // Update the block objects and SVG image from user input, but don't forcibly change
  // the syntax box to the sanitized version (in case they are still editing)
  updateBlockObjects(mermaid_syntax);
  updateMermaidSVG(mermaid_syntax);
});

document.addEventListener("mousedown", evt => {
  mouseDown = {
    recent: true,
    active: true,
    x: evt.clientX,
    y: evt.clientY,
    blockId: getBlockFromClick(evt)
  };
  window.setTimeout(() => {
    mouseDown.recent = false;
  }, 200);
});

document.addEventListener("mousemove", evt => {
  destroyConnectionLine();

  if (mouseDown != null && mouseDown.active && mouseDown.blockId != -1) {
    var connectionLine = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );

    var svg = document.getElementById("mermaid_svg").firstChild;

    fromPos = clientCoordsToObject(mouseDown.x, mouseDown.y, svg);
    toPos = clientCoordsToObject(evt.clientX, evt.clientY, svg);

    connectionLine.setAttribute("id", "connection_line");
    connectionLine.setAttribute("x1", fromPos.x - 37);
    connectionLine.setAttribute("y1", fromPos.y - 37);
    connectionLine.setAttribute("x2", toPos.x - 37);
    connectionLine.setAttribute("y2", toPos.y - 37);
    connectionLine.setAttribute("stroke", "black");

    svg.insertBefore(connectionLine, svg.firstChild);
  }
});

document.addEventListener("mouseup", evt => {
  mouseUp = {
    x: evt.clientX,
    y: evt.clientY,
    blockId: getBlockFromClick(evt)
  };

  mouseDown.active = false;
  destroyConnectionLine();

  var dist = Math.hypot(mouseUp.x - mouseDown.x, mouseUp.y - mouseDown.y);
  var farEnough = dist >= 4;

  // Detect block/arrow selection click
  if (mouseDown != null) {
    if (mouseDown.recent && !farEnough) {
      blockId = getBlockFromClick(evt);
      arrowId = getArrowFromClick(evt);

      if (blockId != -1) {
        selectBlockText(blockId);
      }

      if (arrowId != -1) {
        selectArrow(arrowId);
      }
    }
  }

  // Detect arrow-ending, whether proper or no
  if (mouseDown.blockId != -1) {
    fromBlockId = mouseDown.blockId;
    toBlockId = getBlockFromClick(evt);

    if (toBlockId != -1 && farEnough) {
      blocks[fromBlockId].to.push({
        i: toBlockId,
        s: ""
      });
      var mermaid_syntax = getMermaidSyntax(blocks);
      updateMermaidSVG(mermaid_syntax);
      updateMermaidSyntaxText(mermaid_syntax);
    }
  }

  // Update block selection highlights
  highlightSelected();
});

document.addEventListener("keyup", evt => {
  // If a block selected, and we pressed alt + num,
  // assign color to block and update mermaid graph
  [selectedBlock, selectedArrow] = getSelectedObject();
  if (selectedBlock != null && blocks[selectedBlock] && evt.altKey) {
    var index = Number(evt.key);
    var changed = false;
    if (index != NaN) {
      if (index == 1) {
        changed = true;
        blocks[selectedBlock].color = "";
      } else if (index > 1) {
        var color = colors[index - 2];
        if (color) {
          changed = true;
          blocks[selectedBlock].color = color;
        }
      }
    }

    if (changed) {
      var mermaid_syntax = getMermaidSyntax(blocks);
      updateMermaidSVG(mermaid_syntax);
      // updateMermaidSyntaxText(mermaid_syntax);
    }
  }

  highlightSelected();
});

destroyConnectionLine = () => {
  var connectionLine = document.getElementById("connection_line");

  if (connectionLine) {
    connectionLine.parentNode.removeChild(connectionLine);
  }
};

getBlockFromClick = evt => {
  if (evt.target.localName == "rect" || evt.target.localName == "div") {
    if (evt.target.localName == "div") {
      if (evt.target.parentNode.localName == "foreignObject") {
        blockId = evt.target.parentNode.parentNode.parentNode.parentNode.id;
      } else {
        blockId = -1;
      }
    } else if (evt.target.localName == "rect") {
      blockId = evt.target.parentNode.id;
    } else {
      blockId = -1;
    }
  } else {
    blockId = -1;
  }

  return blockId;
};

getArrowFromClick = evt => {
  if (
    evt.target.localName == "span" &&
    evt.target.parentNode.localName == "div"
  ) {
    var arrowElement = evt.target.parentNode.parentNode.parentNode.parentNode;

    // Get index of arrow element
    for (var i = 0; (arrowElement = arrowElement.previousSibling); i++);
    var arrowId = i;
  } else if (evt.target.localName != "rect" && evt.target.localName != "div") {
    var arrows = document.getElementsByClassName("edgePath");

    // Build a list of line segments and their parent arrows
    var segments = [];
    var svg = document.getElementById("mermaid_svg").firstChild;
    if (svg != null) {
      var boundingBox = svg.getBoundingClientRect();

      var i = 0;
      for (arrow of arrows) {
        var from = null;

        for (segment of arrow.firstChild.pathSegList) {
          var to = {
            x: segment.x + boundingBox.x + 40,
            y: segment.y + boundingBox.y + 40
          };

          if (from != null) {
            segments.push({
              from: from,
              to: to,
              arrow: i
            });
          }

          from = to;
        }

        i++;
      }
    }

    // Define meaning of "point-line distance"
    pointLineDistance = (x, y, x1, y1, x2, y2) => {
      var A = x - x1;
      var B = y - y1;
      var C = x2 - x1;
      var D = y2 - y1;

      var dot = A * C + B * D;
      var len_sq = C * C + D * D;
      var param = -1;

      if (len_sq != 0) param = dot / len_sq;

      var xx = param < 0 ? x1 : param > 1 ? x2 : x1 + param * C;
      var yy = param < 0 ? y1 : param > 1 ? y2 : y1 + param * D;

      var dx = x - xx;
      var dy = y - yy;

      return Math.sqrt(dx * dx + dy * dy);
    };

    // For each segment, compute the distance from line to mouse
    for (seg of segments) {
      seg.dist = pointLineDistance(
        evt.clientX,
        evt.clientY,
        seg.from.x,
        seg.from.y,
        seg.to.x,
        seg.to.y
      );
    }

    // Get closest segment if one exists.
    if (segments.length > 0) {
      var closestSegment = segments.reduce((a, b) => {
        return a.dist < b.dist ? a : b;
      });

      if (closestSegment.dist < 10) {
        arrowId = closestSegment.arrow;
      } else {
        arrowId = -1;
      }
    } else {
      arrowId = -1;
    }
  } else {
    arrowId = -1;
  }

  return arrowId;
};

getTextDiv = i => {
  return document
    .getElementById("" + i)
    .getElementsByTagName("g")[0]
    .getElementsByTagName("g")[0]
    .getElementsByTagName("foreignObject")[0]
    .getElementsByTagName("div")[0];
};

selectBlockText = blockId => {
  var textArea = document.getElementById("mermaid_syntax_div");

  var block = null;
  var reg = new RegExp(regex.block);
  for (var i = 0; i <= blockId; i++) {
    block = reg.exec(textArea.value);
    if (Number(block[1]) == blockId) {
      break;
    }
  }

  var start = block.index + block[1].length + block[2].length;
  var end = start + block[3].length;

  textArea.focus();
  textArea.selectionStart = start;
  textArea.selectionEnd = end;
};

selectArrow = arrowId => {
  var textArea = document.getElementById("mermaid_syntax_div");

  var arrow = null;
  var reg = new RegExp(regex.arrow);
  for (var i = 0; i <= arrowId; i++) {
    arrow = reg.exec(textArea.value);
  }

  var start = arrow.index + arrow[1].length + arrow[2].length;
  var end = start + arrow[3].length;

  textArea.focus();
  textArea.selectionStart = start;
  textArea.selectionEnd = end;
};

sanitizeMermaidSyntax = mermaid_syntax => {
  var textArea = document.getElementById("mermaid_syntax_div");

  // Replace empty block names with a space
  mermaid_syntax.replace(regex.emptyBlock, "$1 ");

  // Remove any line which doesn't match the validation regex
  mermaid_syntax = mermaid_syntax.match(regex.valid).join("\n");

  // If the first line isn't a header, add "graph TD" as first line
  if (!mermaid_syntax.match(regex.header)) {
    mermaid_syntax = "graph TD\n" + mermaid_syntax;
  }

  console.log(mermaid_syntax);

  // Get list of block indices
  var blockIndices = mermaid_syntax.match(regex.blockIndex);
  blockIndices = blockIndices.map(Number);

  // Remove arrows that reference non-existing blocks
  var arrows = forEachMatch(regex.arrow, mermaid_syntax, match => {
    var from = Number(match[1]);
    var to = Number(match[5]);
    if (blockIndices.includes(from) && blockIndices.includes(to)) {
      return match[0];
    }
  });
  mermaid_syntax = mermaid_syntax.replace(
    regex.allArrows,
    arrows.join("\n") + "\n"
  );

  // Define meaning of 'word-wrap'
  var wrap = (s, w, b) => {
    return s.replace(
      new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, "g"),
      "$1" + b
    );
  };

  // Insert word-wrap line breaks on block text
  var blocks = forEachMatch(regex.block, mermaid_syntax, match => {
    return (
      match[1] +
      match[2] +
      wrap(match[3].replace(/<br>/g, " "), 32, "<br>") +
      match[4]
    );
  });
  mermaid_syntax = mermaid_syntax.replace(
    regex.allBlocks,
    blocks.join("\n") + "\n"
  );

  return mermaid_syntax;
};

getRandomPhrase = (wordlist, n) => {
  n = n > wordlist.length ? wordlist.length : n;
  s = "";
  words = wordlist.slice();

  for (i = 0; i < n; i++) {
    var rand = Math.floor(Math.random() * (words.length - 1)) + 1;
    s += words[rand] + " ";
    words.splice(rand, 1);
  }

  if (n >= 1) {
    s = s.slice(0, -1);
  }

  return s;
};

updateBlockObjects = mermaid_syntax => {
  // Create block structure from scratch given string
  blocks = [];

  // Build each block from string
  forEachMatch(regex.block, mermaid_syntax, match => {
    var i = Number(match[1]);
    blocks[i] = {
      i: Number(match[1]),
      s: match[3],
      to: [],
      color: defaultColor
    };
  });

  // Connect each blocks from arrows in string
  forEachMatch(regex.arrow, mermaid_syntax, match => {
    blocks[Number(match[1])].to.push({
      i: Number(match[5]),
      s: match[3]
    });
  });

  // Assign each class to appropriate blocks
  forEachMatch(regex.classAssign, mermaid_syntax, match => {
    color = match[4];
    indices = match[2].split(",").map(Number);

    for (index of indices) {
      if (blocks[index]) {
        blocks[index].color = color;
      }
    }
  });
};

forEachMatch = (pattern, target, f) => {
  var fullMatch = target.match(pattern);
  var results = [];

  if (fullMatch != null) {
    var numMatches = fullMatch.length;
    var match = null;
    for (i = 0; i < numMatches; i++) {
      match = pattern.exec(target);
      var result = f(match);
      if (result != undefined) {
        if (result === null) {
          break;
        } else {
          results.push(result);
        }
      }
    }
  }

  return results;
};

updateMermaidSVG = mermaid_syntax => {
  mermaid_svg = document.getElementById("mermaid_svg");

  while (mermaid_svg.hasChildNodes()) {
    mermaid_svg.removeChild(mermaid_svg.lastChild);
  }

  mermaid_svg.innerHTML = mermaid_syntax;

  mermaid.render("mermaid_svg", mermaid_syntax, svgCode => {
    mermaid_svg.innerHTML = svgCode;

    var right = Number(mermaid_svg.getAttribute("viewBox").split(" ")[2]);
    var down = Number(mermaid_svg.getAttribute("viewBox").split(" ")[3]);

    var margin = 40;
    var viewBox = [-margin, -margin, right + margin * 4, down + margin * 2];
    var viewBoxString =
      "" + viewBox[0] + " " + viewBox[1] + " " + viewBox[2] + " " + viewBox[3];

    mermaid_svg.style.maxWidth = "" + viewBox[2] + "px";
    mermaid_svg.setAttribute("viewBox", viewBoxString);
    mermaid_svg.firstChild.setAttribute("viewBox", viewBoxString);
  });
};

updateMermaidSyntaxText = mermaid_syntax => {
  mermaid_syntax_div = document.getElementById("mermaid_syntax_div");
  mermaid_syntax_div.value = mermaid_syntax;
};

getMermaidSyntax = blocks => {
  s = "graph TD\n";
  for (block of blocks) {
    if (block) {
      s += block.i + "[" + block.s + "]\n";
    }
  }
  for (block of blocks) {
    if (block) {
      for (arrow of block.to) {
        s += block.i + " -->| " + arrow.s + " | " + arrow.i + "\n";
      }
    }
  }
  s += "classDef " + colors[0] + " fill:#EFFEED,stroke:#60A355\n";
  s += "classDef " + colors[1] + " fill:#ECFEFC,stroke:#3F7975\n";
  s += "classDef " + colors[2] + " fill:#FFEDEE,stroke:#C0646B\n";
  s += "classDef " + colors[3] + " fill:#FFF5ED,stroke:#C59067\n";

  for (color of colors) {
    t = "class ";
    var found = false;
    for (block of blocks) {
      if (block && block.color == color) {
        t += block.i + ",";
        found = true;
      }
    }
    t = t.slice(0, -1);
    t += " " + color;
    if (found) {
      s += t + "\n";
    }
  }

  return s;
};

getSelectedObject = () => {
  var textarea = document.getElementById("mermaid_syntax_div");
  var start = textarea.selectionStart;

  var selectedBlock = null;
  var selectedArrow = null;

  // If textarea has focus, find which block or arrow line is selected (if any)
  if (textarea == document.activeElement) {
    var start = textarea.selectionStart;

    forEachMatch(regex.block, textarea.value, match => {
      if (start >= match.index && start <= match.index + match[0].length) {
        selectedBlock = Number(match[1]);
        return null;
      }
    });

    var currentArrow = 0;
    forEachMatch(regex.arrow, textarea.value, match => {
      if (start >= match.index && start <= match.index + match[0].length) {
        selectedArrow = currentArrow;
        return null;
      }

      currentArrow++;
    });
  }

  return [selectedBlock, selectedArrow];
};

/**
 * @function
 * @name highlightSelected
 * @description Visually highlight selected blocks or arrows based on textarea selection
 */
highlightSelected = () => {
  // Unhighlight all blocks
  for (i in blocks) {
    if (blocks[i]) {
      document.getElementById(i).firstChild.style.strokeWidth = "";
    }
  }

  // Unhighlight all arrows
  var arrows = document.getElementsByClassName("edgePath");
  for (arrow of arrows) {
    arrow.firstChild.style.strokeWidth = "";
  }

  [selectedBlock, selectedArrow] = getSelectedObject();

  // Highlight a block if one is selected
  if (selectedBlock != null) {
    var blockElement = document.getElementById(selectedBlock);
    if (blockElement != null) {
      document.getElementById(selectedBlock).firstChild.style.strokeWidth =
        "4px";
    }
  }
  // Else highlight an arrow if one is selected
  else if (selectedArrow != null) {
    if (arrows[selectedArrow] != undefined) {
      arrows[selectedArrow].firstChild.style.strokeWidth = "3px";
    }
  }
  // If nothing is selected, update the text syntax field to current graph
  else {
    var mermaid_syntax = getMermaidSyntax(blocks);
    updateMermaidSyntaxText(mermaid_syntax);
  }
};

/**
 * @function
 * @name clientCoordsToObject
 * @param {Number} x
 * @param {Number} y
 * @param {Node} obj
 * @description Convert client coordinates to coordinates relative to DOM element
 */
clientCoordsToObject = (x, y, obj) => {
  if (obj != null) {
    var objPos = obj.getBoundingClientRect();
    return {
      x: x - objPos.x,
      y: y - objPos.y
    };
  } else {
    return null;
  }
};
