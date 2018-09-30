// Program entry and loop definition
var fps = 30;
clearInterval(mainloop);
var mainloop = setInterval("main();", 1000 / fps);

var ltl_expression = "";

document.addEventListener(
  "DOMContentLoaded",
  function() {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      flowchart: { curve: "linear" }
    });

    document.getElementById("ltl_expression").value =
      "113 355 / 3533 .0003 / 1 - *";
  },
  false
);

function main() {
  var ltl_expression_changed = false;

  // If ltl expression changed, obtain it
  if (document.getElementById("ltl_expression")) {
    let current_ltl_expression = document.getElementById("ltl_expression")
      .value; // let = temp variable

    if (current_ltl_expression != ltl_expression) {
      ltl_expression = current_ltl_expression;
      ltl_expression_changed = true;
    }
  }

  // If the ltl expression changed
  if (ltl_expression_changed) {
    // Parse the ltl expression
    let result = parseLTLExpression(ltl_expression);

    let output_element = document.getElementById("ltl_output");
    let node_list_element = document.getElementById("node_list");
    let syntax_tree = document.getElementById("syntax_tree");

    // If result is a number
    if (!isNaN(result)) {
      console.log(result);

      output_element.innerHTML = result;

      // Generate node list
      let node_list = buildNodeList(ltl_expression);

      // Generate node list formatted string
      let formatted_node_list_string = generateNodeListString(node_list);

      // Put generated node list in node list textbox
      node_list_element.innerHTML = formatted_node_list_string;

      while (syntax_tree.hasChildNodes()) {
        syntax_tree.removeChild(syntax_tree.lastChild);
      }

      syntax_tree.innerHTML = formatted_node_list_string;

      // mermaid.init()

      mermaid.render(syntax_tree.id, formatted_node_list_string, function(
        svgCode
      ) {
        syntax_tree.innerHTML = svgCode;
        syntax_tree.firstChild.style.height =
          Number(syntax_tree.getAttribute("viewbox").split(" ")[3]) + 20 + "px";
        syntax_tree.firstChild.style.width =
          Number(syntax_tree.getAttribute("viewbox").split(" ")[2]) + 20 + "px";
      });
    } else {
      output_element.innerHTML = "Not a valid LTL expression";
      node_list_element.innerHTML = "";
    }

    // Update the result div with value
    document.getElementById("ltl_output").innerHTML = result;
  }
}

// From a node list (see buildNodeList), construct a formatted string which
// displays that data
function generateNodeListString(node_list) {
  var string = "graph TD\n";

  // We want to iterate through in reverse so that top elements are specified first
  // helps the automatic graph generator (mermaid)
  node_list.reverse();

  // First, on each line, write each token string
  for (i in node_list) {
    var node = node_list[i];
    if (node == "") {
      node = " "; // Fixes bug in graph generation
    }
    string += node.place + "[" + node + "]\n";
  }

  // Write empty line to separate connections from nodes
  string += "\n";

  // On each line write connections in form 0 --> 1
  for (const node of node_list) {
    for (const child of node.children) {
      string += node.place + " --> " + child + "\n";
    }
  }

  return string;
}

// Build list of tokens and their connections, as an array of strings,
// where each string has a .children array of indices pointing to
// other strings
function buildNodeList(ltl_expression) {
  // Split string using " " as delimiter
  var tokens = ltl_expression.split(" ");

  // We keep a stack, but instead of pushing results of operations, we push
  // the token of the operation itself
  var stack = [];

  for (var i in tokens) {
    var token = new String(tokens[i]); // Promote to expandable String object, instead of literal

    // We promote it so we can add attributes dynamically
    token.place = i;
    token.children = [];

    // Is the token a number?
    if (!isNaN(token)) {
      stack.push(token);
    }
    // Is the token a +?
    else if (token == "+") {
      let a = stack.pop();
      let b = stack.pop();

      token.children = [a.place, b.place];

      stack.push(token);
    }
    // Is the token a -?
    else if (token == "-") {
      let a = stack.pop();
      let b = stack.pop();

      token.children = [a.place, b.place];

      stack.push(token);
    }
    // Is the token a *?
    else if (token == "*") {
      let a = stack.pop();
      let b = stack.pop();

      token.children = [a.place, b.place];

      stack.push(token);
    }
    // Is the token a /?
    else if (token == "/") {
      let a = stack.pop();
      let b = stack.pop();

      token.children = [a.place, b.place];

      stack.push(token);
    }

    // Since we used "new", we need to explicitly overwrite the native string
    // with our promoted String object.
    tokens[i] = token;
  }

  console.log("Stack length: " + stack.length);

  return tokens;
}

// Given expression, calculate 1 arithmetic number
function parseLTLExpression(ltl_expression) {
  // Split string using " " as delimiter
  var tokens = ltl_expression.split(" ");
  var stack = [];

  for (const token of tokens) {
    // Is the token a number?
    if (!isNaN(token)) {
      stack.push(token);
    }
    // Is the token a +?
    else if (token == "+") {
      let a = Number(stack.pop());
      let b = Number(stack.pop());

      let x = a + b;
      stack.push(x);
    }
    // Is the token a -?
    else if (token == "-") {
      let a = Number(stack.pop());
      let b = Number(stack.pop());

      let x = a - b;
      stack.push(x);
    }
    // Is the token a *?
    else if (token == "*") {
      let a = Number(stack.pop());
      let b = Number(stack.pop());

      let x = a * b;
      stack.push(x);
    }
    // Is the token a /?
    else if (token == "/") {
      let a = Number(stack.pop());
      let b = Number(stack.pop());

      let x = a / b;
      stack.push(x);
    }
  }

  // At the end, we should only have one item on the stack.
  var result;

  if (stack.length == 1) {
    result = stack.pop();
  } else {
    result = 0;
    console.log("Ending stack length was " + stack.length + ", not one.");
  }

  return result;
}
