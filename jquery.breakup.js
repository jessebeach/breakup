/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 4
 browser: true */

/*global window: true define: true */

/**
 * A jQuery plugin.
 *
 * Register arbitrary functions to be fired against jQuery objects when
 * specified break points are entered.
 *
 * Author: Jesse Renée Beach
 * Author URI: http://qemist.us
 * Author Twitter: @jessebeach
 * Author Github: https://github.com/jessebeach
 *
 */

(function (factory) {
  // Load this plugin with require.js if available.
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } 
  else {
    // If jQuery is not defined, warn the user and return.
    if (window.jQuery === undefined) {
      if (typeof window.console === 'object' && typeof window.console.log === 'function') {
        console.log("The plugin \"pluginName\" failed to run because jQuery is not present.");
      }
      return null;
    }
    // Call the plugin factory. jQuery is a global object.
    factory();
  }
}
// The plugin factory function.
(function () {
  // Replace 'pluginName' with the name of your plugin.
  var plugin = 'BreakUp';
  // plugin defaults
  var defaults = {
    '0': $.noop
  }
	/**
   * Simple console logging utility that won't blow up in older browsers.
   */
  function log (message, type) {
    if ('console' in window) {
      var type = type || 'log';
      console[type](message);
    }
  }
  /**
   * Returns a function with 'this' set as the context object.
   *
   * All additional arguments are passed through to the returned function.
   */
  function buildProxy(fn, context) {
    var f = fn;
    var c = context;
    // Pull the top two args -- fn and context -- off the arguments array.
    for (var i = 0; i < 2; i++) {
      Array.prototype.shift.call(arguments);
    }
    // Get a local reference to the arguments.
    var args = Array.prototype.slice.call(arguments);
    return (function () {
      // Push the callers arguments into the arguments list.
      // This will most likely be an $.Event object.
      for (var i = 0; i < arguments.length; i++) {
        args.unshift(arguments[i]);
      }
      f.apply(c, args);
    });
  }
  /**
  * Get the screen width.
  */
  function getScreenWidth () {
    return window.innerWidth || document.documentElement.offsetWidth || document.documentElement.clientWidth;
  }
  // Add the plugin as a property of the jQuery fn object.
  $[plugin] = function BreakUp() {
    // State variables.
    var currentBreak;
    var breakPoints = {};
    var updated = false;
    var namespace = plugin;
    var $elements = $();
    var shift = Array.prototype.shift;
    var unshift = Array.prototype.unshift;
    var slice = Array.prototype.slice;
    var splice = Array.prototype.splice;
    var fn;
    // Public functions.
    this.listBreakPoints = listBreakPoints;
    this.getNameSpace = getNameSpace;
    /**
     * Build a new BreakUp object.
     */
    function initialize (breakpoints, options, selector) {
      // Determine if breakpoints were passed in. If not, return, there's nothing to do.
      if (typeof breakpoints === 'string' || (typeof breakpoints === 'object' && 'jquery' in breakpoints)) {
        log('[' + plugin + '] No breakpoints were provided for BreakUp to act on.', 'info');
        return;
      }
      // Merge user options with default options.
      var bp = $.extend({}, defaults, breakpoints);
      // Strip the opts from the arguments list.
      shift.call(arguments);
      // Unshift the options back into the arguments.
      unshift.call(arguments, bp);
      // Options is a jquery object or selector
      if ((typeof options === 'object' && 'jquery' in options) || typeof options === 'string') {
        // Slip an undefined into the arguments where the options should be.
        splice.call(arguments, 1, 0, undefined);
      }
      // Process the options.
      if (options) {
        namespace = (options && 'namespace' in options && typeof options.namespace === 'string' && options.namespace.length > 0) ? options.namespace : plugin;
      }
      // A selector is necessary to create a context. It cannot be empty. First check
      // for a string selector.
      if (typeof selector === 'string' || selector === window || selector === document) {
        $elements = $(selector);
        // If the selector was provided as something other than a jQuery obejct,
        // we need to replace the corresponding argument with the jQuery selector version.
        splice.call(arguments, 2, 1, $elements);
      }
      // Then check for a jQuery object. 
      else if (typeof selector === 'object' && 'jquery' in selector) {
        $elements = selector;
      }
      // If the selector matched nothing, error out.
      if ($elements.length === 0) {
        log('[' + plugin + '] Neither a jQuery object nor a valid selector were provided for BreakUp to act on.', 'info');
        return;
      }
      // The arguments should only contain the breakpoints, the context elements,
      // and additional arguments for the callbacks from this point on.
      // The options are needed only for initialization, we remove them.
      splice.call(arguments, 1, 1);
      // Register the callbacks.
      setBreakPoints.apply(this, arguments);
      // Register a custom 'breakChanged' event on the context.
      $elements.bind('breakChanged' + '.' + namespace, breakChangeHandler);
      // Register a handler on the window resize event.
      fn = buildProxy.call(this, breakCheck, $elements);
      $(window).bind('resize' + '.' + namespace, fn);
      $(window).bind('load' + '.' + namespace, fn);
    } 
    /**
     * Given an object of breakpoint properties and functions associated with those properties,
     * store them internally for reference later.
     */
    function setBreakPoints(breakpoints) {
      var bps = breakpoints;
      var br;
      var index;
      if (typeof bps === 'object') {
        // Remove the breakpoints from the arguments array.
        shift.call(arguments);
        // Loop through the breakpoints.
        for (br in bps) {
          if (bps.hasOwnProperty(br)) {
            if (isNaN(br) && br !== 'default') {
              log('[' + plugin + '] The breakpoint property name \"' + br + '\" is not valid. The property must convert to a number or be the word \"default\".', 'info');
              continue;
            }
            if (typeof bps[br] === 'function') {
              // Represent the default breakpoint as zero internally.
              index = (br === 'default') ? '0': br;
              // Unshift the function into the arguments.
              unshift.call(arguments, bps[br]);
              var args = slice.call(arguments);
              // Build a proxy from the function and store it.
              breakPoints[index] = buildProxy.apply(this, arguments);
              // Shift the function off the arguments.
              shift.call(arguments);
            }
            else {
              log('[' + plugin + '] ' + bps[br] + ', for the breakpoint ' + br + ' is not a function.', 'info');
            }
          }
        }
      }
    }
    /**
     * Gets the current breakpoint.
     *
     * @return (String) candidate: the number-as-a-string index in the list of breakPoints
     * of the current break point as determined by the screen size.
     */
    function getBreakPoint () {
      var br;
      var candidate;
      var screen = getScreenWidth();
      for (br in breakPoints) {
        if (breakPoints.hasOwnProperty(br)) {
          if (Number(br) <= screen && (Number(br) > Number(candidate) || Number(br) === 0)) {
            candidate = br;
          }
        }
      }
      return candidate;
    }
    /**
     * Returns the stored set of breakpoints and their functions.
     */
    function listBreakPoints() {
      return breakPoints;
    }
     /**
     * Get the current break point and call the function associated with it.
     */
    function breakChangeHandler(event) {
      // updated will be set to false when a new breakpoint is encountered.
      if (!updated) {
        var $this = $(this);
        var callback = getBreakPointHandler();
        if (typeof callback === 'function') {
          // Pass the event object through to the callback.
          callback(event);
          updated = true;
          return;
        }
        else {
          log('[' + plugin + '] The handler for the current breakpoint is not a function.', 'info');
        }
      }
    }
    /**
     * Get the function associated with a stored breakpoint.
     */
    function getBreakPointHandler () {
      return breakPoints[getBreakPoint()];
    }
    /**
     * Check to see if the screen is in a new breakpoint. Also
     * called on page load.
     */
    function breakCheck (event) {
      var $this = $(this);
      var br = getBreakPoint();
      if (currentBreak !== br) {
        // Save the current breakpoint in this scope.
        currentBreak = br;
        updated = false;
        $this.trigger('breakChanged');
      }
    }
    /**
     *
     */
    function setNameSpace(ns) {
      namespace = ns;
    }
    /**
     * 
     */
    function getNameSpace() {
      return namespace;
    }
    // Return a new BreakUp object.
    return initialize.apply(this, arguments);
  };
}));
