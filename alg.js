
var alg = (function (){

  var debug = false;

  var patterns = {
    single: /^[UFRBLD]$/,
    wide: /^([ufrbld])|([UFRBLD]w)$/,
    slice: /^[MNES]$/,
    rotation: /^[xyz]$/,
    pause: /^\.$/
  };

  function moveKind(moveString) {
    for (s in patterns) {
      if (patterns[s].test(moveString)) {
        return s;
      }
    }
    return "UNKNOWN";
  }

  var directionMap = {
    "U": "U", "Uw": "U", "u": "U",           "y": "U",
    "F": "F", "Fw": "F", "f": "F", "S": "F", "z": "F",
    "R": "R", "Rw": "R", "r": "R", "N": "R", "x": "R",
    "B": "B", "Bw": "B", "b": "B",
    "L": "L", "Lw": "L", "l": "L", "M": "L",
    "D": "D", "Dw": "D", "d": "D", "E": "D",
    ".": "."
  };

  function canonicalizeMove(orig, dimension) {
    var move = {};

    move.amount = orig.amount;
    move.base = directionMap[orig.base];

    if (patterns.single.test(orig.base)) {
      move.startLayer = orig.layer || 1;
      move.endLayer = move.startLayer;
    } else if (patterns.wide.test(orig.base)) {
      move.startLayer = orig.startLayer || 1;
      move.endLayer = orig.endLayer || 2;
    } else if (patterns.slice.test(orig.base)) {
      move.startLayer = 2;
      move.endLayer = dimension - 1;
    } else if (patterns.rotation.test(orig.base)) {
      move.startLayer = 1;
      move.endLayer = dimension;
    }

    return move;
  }

  function round(x) {
    // We want to round:
    //    2.6 to  3
    //    2.5 to  2
    //   -2.5 to -2
    var antiSignish = x < 0 ? 1 : -1; // When can we haz ES6?
    return Math.round(-Math.abs(x)) * antiSignish;
  }

  var cube = (function(){

    function algSimplify(alg) {
      var algOut = [];
      for (var i = 0; i < alg.length; i++) {
        var move = alg[i];
        if (algOut.length > 0 &&
            algOut[algOut.length-1].startLayer == move.startLayer &&
            algOut[algOut.length-1].endLayer == move.endLayer &&
            algOut[algOut.length-1].base == move.base) {
          var amount = algOut[algOut.length-1].amount + move.amount;
          // Mod to [-2, -1, 0, 1, 2]
          // x | 0 truncates x towards 0.
          amount = amount - 4 * round(amount / 4);
          if (amount == 0) {
            algOut.pop();
          }
          else {
            algOut[algOut.length-1].amount = amount;
          }
        }
        else {
          algOut.push(cloneMove(move));
        }
        //console.log(JSON.stringify(algOut));
      }
      return algOut;
    }

    var repeatableToString = {}

    repeatableToString["move"] = function(move) {
        var tL = move.layer;
        var sL = move.startLayer;
        var oL = move.endLayer;

        var prefix = "";

        // Prefix logic
        if (patterns.single.test(move.base)) {
          if (move.layer) {
            prefix = move.layer.toString();
          }
        } else if (patterns.wide.test(move.base)) {
          if (move.endLayer) {
            prefix = move.endLayer.toString();
            if (move.startLayer) {
              prefix = move.startLayer.toString() + "-" + prefix;
            }
          }
        }

        return prefix + move.base;
    }

    repeatableToString["commutator"] = function(commutator) {
      return "[" + algToString(commutator.A) + ", " + algToString(commutator.B) + "]";
    }

    repeatableToString["conjugate"] = function(commutator) {
      return "[" + algToString(commutator.A) + ", " + algToString(commutator.B) + "]";
    }

    repeatableToString["group"] = function(group) {
      return "(" + algToString(group.A) + ")";
    }

    function suffix(repeated) {

      var amount = Math.abs(repeated.amount);
      var amountDir = (repeated.amount > 0) ? 1 : -1; // Mutable

      var suffix = ""
      // Suffix Logic
      if (amount > 1) {
        suffix += "" + amount;
      }

      if (amountDir === -1) {
        suffix += "'";
      }
      return suffix;
    }

    function algToString(alg, dimension) {

      var moveStrings = [];
      for (i in alg) {
        var moveString = repeatableToString[alg[i].type](alg[i]) + suffix(alg[i]);
        moveStrings.push(moveString);
      }
      return moveStrings.join(" ");
    }

    function cloneMove(move) {
      var newMove = {};
      for (i in move) {
        newMove[i] = move[i]
      }
      return newMove;
    }

    function invert(algIn) {
      var algInverse = [];
      for (i in algIn) {
        var move = cloneMove(algIn[i]);
        move.amount *= -1;
        algInverse.push(move);
      }
      return algInverse.reverse();
    }

    function repeatMoves(movesIn, accordingTo) {

      var movesOnce = movesIn;

      var amount = Math.abs(accordingTo.amount);
      var amountDir = (accordingTo.amount > 0) ? 1 : -1; // Mutable

      if (amountDir == -1) {
        movesOnce = invert(movesOnce);
      }

      var movesOut = [];
      for (var i = 0; i < amount; i++) {
        movesOut = movesOut.concat(movesOnce);
      }

      return movesOut;
    }

    var mirrorSlicesAcrossM = {
      "U": "U", "Uw": "Uw", "u": "u",           "y": "y",
      "F": "F", "Fw": "Fw", "f": "f", "S": "S", "z": "z",
      "R": "L", "Rw": "Lw", "r": "l", "N": "N", "x": "x",
      "B": "B", "Bw": "Bw", "b": "b",
      "L": "R", "Lw": "Rw", "l": "r", "M": "M",
      "D": "D", "Dw": "Dw", "d": "d", "E": "E",
      ".": "."
    };

    // TODO: Factor out a structural recursion skeleton.
    // TODO: Arbitrary mirrors and transformations.
    var mirrorAlg = function(algIn) {
      var moves = [];
      for (i in algIn) {
        moves = moves.concat(mirrorAlg[algIn[i].type](algIn[i]));
      }
      return moves;
    };

    mirrorAlg["move"] = function(move) {
      var mirroredMove = cloneMove(move);
      if (["x", "M", "N", "."].indexOf(mirroredMove.base) === -1) {
        mirroredMove.base = mirrorSlicesAcrossM[mirroredMove.base];
        mirroredMove.amount = -mirroredMove.amount;
      }
      return mirroredMove;
    }

    mirrorAlg["commutator"] = function(commutator) {
      return {
        "type": "commutator",
        "A": mirrorAlg(commutator.A),
        "B": mirrorAlg(commutator.B)
      };
    }

    mirrorAlg["conjugate"] = function(conjugate) {
      return {
        "type": "conjugate",
        "A": mirrorAlg(conjugate.A),
        "B": mirrorAlg(conjugate.B)
      };
    }

    mirrorAlg["group"] = function(group) {
      return {
        "type": "group",
        "A": mirrorAlg(group.A),
      };
    }

    mirrorAlg["timestamp"] = function(group) {
      return group;
    }


    function algToMoves(algIn) {
      var moves = [];
      for (i in algIn) {
        moves = moves.concat(algToMoves[algIn[i].type](algIn[i]));
      }
      return moves;
    }

    algToMoves["move"] = function(move) {
      return [move];
    }

    algToMoves["commutator"] = function(commutator) {
      var once = [].concat(
        algToMoves(commutator.A),
        algToMoves(commutator.B),
        invert(algToMoves(commutator.A)),
        invert(algToMoves(commutator.B))
      );
      return repeatMoves(once, commutator);
    }

    algToMoves["conjugate"] = function(conjugate) {
      var once = [].concat(
        algToMoves(conjugate.A),
        algToMoves(conjugate.B),
        invert(algToMoves(conjugate.A))
      );
      return repeatMoves(once, conjugate);
    }

    algToMoves["group"] = function(group) {
      var once = algToMoves(group.A);
      return repeatMoves(once, group);
    }

    algToMoves["timestamp"] = function(group) {
      return [];
    }

    function stringToAlg(algString) {
      return alg_jison.parse(algString);
    }

    // Metric

    var moveCountScalars = {
       "obtm": {rotation: [0, 0], outer: [1, 0], inner: [2, 0]},
        "btm": {rotation: [0, 0], outer: [1, 0], inner: [1, 0]},
      "obqtm": {rotation: [0, 0], outer: [0, 1], inner: [0, 2]},
        "etm": {rotation: [1, 0], outer: [1, 0], inner: [1, 0]}
    }

    function moveScale(amount, scalars) {
      if (amount == 0) {
        return 0; //TODO: ETM?
      }
      return scalars[0] + Math.abs(amount) * scalars[1];
    }

    function countMove(move, metric, dimension) {
      // Assumes `move` is a valid move.
      var can = canonicalizeMove(move, dimension);

      var mKind = moveKind(can.base);
      if (mKind === "pause") {
        return 0;
      }

      var scalarKind;
      if (can.startLayer === 1 && can.endLayer === dimension) {
        scalarKind = "rotation";
      } else if (can.startLayer === 1 || can.endLayer === dimension) {
        scalarKind = "outer";
      } else if (1 < can.startLayer && can.startLayer <= can.endLayer && can.endLayer < dimension) {
        scalarKind = "inner";
      } else {
        throw "Unkown move.";
      }
      var scalars = moveCountScalars[metric][scalarKind];
      return moveScale(can.amount, scalars);
    }

    function countMoves(algo, metric, dimension) {
      var moves = algToMoves(algo); // TODO: multiple dispatch to avoid expanding algs
      var moveCount = 0;
      for (move in moves) {
        moveCount += countMove(moves[move], metric, dimension);
      }
      return moveCount;
    }

    // Exports

    return {
      algToString: algToString,
      algSimplify: algSimplify,
      stringToAlg: stringToAlg,
      invert: invert,
      mirrorAcrossM: mirrorAlg,
      canonicalizeMove: canonicalizeMove,
      algToMoves: algToMoves,
      countMoves: countMoves
    }
  })();

  return {
    cube: cube
  }
})();
