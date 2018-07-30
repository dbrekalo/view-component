var variableInEventStringRE = /{{\s*(\S+)\s*}}/g;

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

function each(obj, callback) {

    for (var key in obj) {
        obj.hasOwnProperty(key) && callback(obj[key], key);
    }

}

function parseEventVariables(eventString, context) {

    return eventString.replace(variableInEventStringRE, function(match, namespace) {

        var current = context;
        var pieces = namespace.slice(5).split('.');

        for (var i in pieces) {
            current = current[pieces[i]];
            if (typeof current === 'undefined') {
                throw new Error('Undefined variable in event string');
            }
        }

        return current;

    });

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

function delegateEventHit(event, selector, container) {

    var hit = false;
    var target = event.target;

    if (matches(target, selector)) {
        hit = true;
    } else {

        var parent = target.parentNode;

        while (parent && parent.nodeType === 1 && parent !== container) {

            if (matches(parent, selector)) {
                hit = true;
                break;
            } else {
                parent = parent.parentNode;
            }

        }
    }

    return hit;

}

module.exports = {
    assign: assign,
    each: each,
    parseEventVariables: parseEventVariables,
    removeNode: removeNode,
    delegateEventHit: delegateEventHit
};
