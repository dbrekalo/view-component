function assign(target, from) {

    if (from) {
        for (var key in from) {
            if (from.hasOwnProperty(key) && typeof from[key] !== 'undefined') {
                target[key] = from[key];
            }
        }
    }

    return target;

}

function each(obj, callback, context) {

    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (callback.call(context, obj[key], key) === false) { break; }
        }
    }

}

function matches(element, selector) {

    return element.matches
        ? element.matches(selector)
        : element.msMatchesSelector(selector)
    ;

}

function removeNode(node) {

    if (node.remove) {
        node.remove();
    } else if (node.parentNode !== null) {
        node.parentNode.removeChild(node);
    }

}

function getMatchingElement(node, selector, container) {

    var matchingNode;
    var parent = node.parentNode;

    if (matches(node, selector)) {
        matchingNode = node;
    } else {
        while (parent && parent.nodeType === 1 && parent !== container) {

            if (matches(parent, selector)) {
                matchingNode = parent;
                break;
            } else {
                parent = parent.parentNode;
            }

        }
    }

    return matchingNode;

}

module.exports = {
    assign: assign,
    each: each,
    removeNode: removeNode,
    getMatchingElement: getMatchingElement
};
