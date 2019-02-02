let inputBox = document.getElementById("text-input");
let outputBox = document.getElementById("text-output");

let replaceAt = (s1, i, j, s2) => {
  return s1.substring(0, i) + s2 + s1.substring(j);
};

inputBox.oninput = evt => {
  let s = evt.target.value;
  s = s.replace(/\\\n/gm, "");
  s = s.replace(/^( .*)integral/gm, "$1\\int");
  s = s.replace(/^( .*)right bracketing bar /gm, "$1\\bigg\\rvert");

  s = s.replace(/\\\[Pi\]/gm, "\\pi");
  s = s.replace(/\\\[Mu\]/gm, "\\mu");
  s = s.replace(/\\\[Sigma\]/gm, "\\sigma");
  s = s.replace(/sqrt/gm, "\\sqrt");

  // Handle fractions

  // Split into lines

  // For each line, if it begins with space, it is math

  // Go forward until "/" is found

  // If "/" is found, save spot and go backwards until either " " or ")"

  // If " " is found, return to "/" spot and start going forwards

  // If ")" is found, continue going left until equal number of "(" are found,
  // then return to "/" spot and start going forwards

  // Start going forward from "/" until " " or "(" is found.

  // If " " is found, end and replace with appropriate \frac{}{}

  // If "(" is found, continue going right until equal number of ")" are found,
  // then end and replace with appropriate \frac{}{}

  lines = s.split(/\r?\n/);

  lines = lines.map(line => {
    if (line[0] == " ") {
      let r = /[^ ()]*\//.exec(line);

      while (r) {
        let fracLeft, fracRight;

        let leftEnd = r.index - 1;
        let slashI = leftEnd + r[0].length;

        if (line[leftEnd] == ")") {
          let rCount = 1;
          let lCount = 0;

          for (let i = leftEnd - 1; i >= 0; i--) {
            let c = line[i];
            if (c == ")") {
              rCount++;
            } else if (c == "(") {
              lCount++;
            }

            if (rCount == lCount) {
              leftEnd = i - 1;
              break;
            }
          }
        }

        let r2 = /\/[^ )(]*/.exec(line);
        let rightEnd = slashI + r2[0].length;

        if (line[rightEnd] == "(") {
          let rCount = 0;
          let lCount = 1;

          for (let i = rightEnd + 1; i < line.length; i++) {
            let c = line[i];
            if (c == ")") {
              rCount++;
            } else if (c == "(") {
              lCount++;
            }

            if (rCount == lCount) {
              rightEnd = i + 1;
              break;
            }
          }
        }

        fracLeft = line.substr(leftEnd + 1, slashI - leftEnd - 1);
        fracRight = line.substr(slashI + 1, rightEnd - slashI - 1);

        let removeExtraParens = /^\((.*)\)$/;
        fracLeft = fracLeft.replace(removeExtraParens, "$1");
        fracRight = fracRight.replace(removeExtraParens, "$1");

        let latexFrac = "\\frac{" + fracLeft + "}{" + fracRight + "}";

        line = replaceAt(line, leftEnd + 1, rightEnd, latexFrac);

        r = /[^ ()]*\//.exec(line);
      }
    }

    return line;
  });

  s = lines.join("\n");

  // Remove all text lines
  s = s.replace(/^[^ ].*\n/gm, "");

  // Remove trailing :
  s = s.replace(/(.*):+/gm, "$1");

  // Remove trailing |
  s = s.replace(/^ \|(.*)/gm, "$1");

  // Remove trailing spaces
  s = s.replace(/^ *(.*) *$/gm, "$1");

  // Remove all spaces
  s = s.replace(/ /gm, "");

  // Add box around last equation
  s = s.replace(/.+$/, "\\boxed{$&}");

  // Wrap all lines in $$
  s = s.replace(/.+/gm, "$$$$$&$$$$");

  outputBox.value = s;
};
