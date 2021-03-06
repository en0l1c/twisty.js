import {Sequence, Example, parse} from "alg"
import {KPuzzle, KPuzzleDefinition, Puzzles} from "kpuzzle"

import {AnimModel} from "./anim"
import {Cursor} from "./cursor"
import {Puzzle, State, KSolvePuzzle} from "./puzzle"
import {Player, VisualizationFormat} from "./widget"

"use strict";

class TwistyParams {
  alg?: Sequence;
  puzzle?: KPuzzleDefinition;
  visualization?: VisualizationFormat;
}

// TODO: Turn Twisty into a module and move Twisty.Twisty into Twisty proper.
export class Twisty {
  private alg: Sequence;
  private anim: AnimModel;
  private cursor: Cursor<Puzzle>;
  private puzzleDef: KPuzzleDefinition; // TODO: Replace this with a Puzzle instance.
  private player: Player;
  constructor(public element: Element, config: TwistyParams = {}) {
    this.alg = config.alg || Example.Niklas;
    this.puzzleDef = config.puzzle || Puzzles["333"];
    this.cursor = new Cursor(this.alg, new KSolvePuzzle(this.puzzleDef));
    // this.timeline = new Timeline(Example.HeadlightSwaps);
    this.anim = new AnimModel(this.cursor);

    this.player = new Player(this.anim, this.puzzleDef, config.visualization);
    this.element.appendChild((this.player).element);
  }

  // Plays the full final move if there is one.
  experimentalSetAlg(alg: Sequence) {
    this.anim.skipToStart();
    this.alg = alg;
    this.cursor.experimentalSetMoves(alg);
    this.anim.skipToEnd();
    this.player.updateFromAnim();
    if (this.anim.cursor.currentTimestamp() > 0) {
      // TODO: This is a hack.
      this.cursor.backward(0.01, false); // TODO: Give this API to `Cursor`/`AnimModel`.
      this.cursor.backward(100000, true); // TODO: Give this API to `Cursor`/`AnimModel`.
      this.anim.stepForward();
    }
  }
}

function paramsFromTwistyElem(elem: Element): TwistyParams {
  var params = new TwistyParams();

  var puzzle = elem.getAttribute("puzzle");
  if (puzzle) {
    params.puzzle = Puzzles[puzzle];
  }

  var algo = elem.getAttribute("alg");
  if (algo) {
    params.alg = parse(algo); // TODO: parse
  }

  var visualization = elem.getAttribute("visualization");
  // TODO: Factor this code out for testing.
  if (visualization) {
    if (visualization === "2D" || visualization === "3D") {
      params.visualization = visualization;
    } else {
      console.warn(`Invalid visualization: ${visualization}`)
    }
  }

  return params;
}

// Initialize a Twisty for the given Element unless the element's
// `initialization` attribute is set to `custom`.
function autoInitialize(elem: Element) {
  const ini = elem.getAttribute("initialization");
  var params = paramsFromTwistyElem(elem);
  if (ini !== "custom") {
    new Twisty(elem, params);
  }
}

function autoInitializePage() {
  const elems = document.querySelectorAll("twisty");
  console.log(`Found ${elems.length} twisty elem${elems.length === 1 ? "" : "s"} on page.`)

  for (let i = 0; i < elems.length; i++) {
    autoInitialize(elems[i]);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", autoInitializePage);
}
