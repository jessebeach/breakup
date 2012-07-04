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
 * Author: Jesse Beach
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
  $[plugin] = function () {
    // State variables.
    var currentBreak;
    var breakPoints = {};
    var updated = false;
    // Public functions.
    this.listBreakPoints = listBreakPoints;
    /**
     * Build a new BreakUp object.
     */
    function initialize (opts, elements) {    // Build main options before element iteration.
      var options = $.extend({}, defaults, opts);
      // Strip the opts from the arguments list.
      Array.prototype.shift.call(arguments);
      // Unshift the options back into the arguments.
      Array.prototype.unshift.call(arguments, options);
      // Create a context from the supplied elements
      var $this = $(arguments[1]);
      // Register the callbacks.
      setBreakPoints.apply($this, arguments);
      // Register a custom 'breakChanged' event on the document.
      $this.bind('breakChanged' + '.' + plugin, breakChangeHandler);
      // Register a handler on the window resize event.
      var f = buildProxy(breakCheck, $this);
      $(window).bind('resize' + '.' + plugin, f);
      $(window).bind('load' + '.' + plugin, f);
      // Public methods
      this.listBreakPoints = listBreakPoints;
    } 
    /**
     * Given an object of breakpoint properties and functions associated with those properties,
     * store them internally for reference later.
     */
    function setBreakPoints(opts) {
      var options = opts;
      var br;
      var index;
      if (typeof options === 'object') {
        // Remove the options from the arguments array.
        Array.prototype.shift.call(arguments);
        // Unshift the context onto the object.
        var that = this;
        Array.prototype.unshift.call(arguments, that);
        // Loop through the breakpoints.
        for (br in options) {
          if (options.hasOwnProperty(br)) {
            if (isNaN(br) && br !== 'default') {
              log('[' + plugin + '] The breakpoint property name \"' + br + '\" is not valid. The property must convert to a number or be the word \"default\".', 'info');
              continue;
            }
            if (typeof options[br] === 'function') {
              // Represent the default breakpoint as zero internally.
              index = (br === 'default') ? '0': br;
              // Unshift the function into the arguments.
              Array.prototype.unshift.call(arguments, options[br]);
              var args = Array.prototype.slice.call(arguments);
              // Build a proxy from the function and store it.
              breakPoints[index] = buildProxy.apply(this, arguments);
              // Shift the function off the arguments.
              Array.prototype.shift.call(arguments);
            }
            else {
              log('[' + plugin + '] ' + options[br] + ', for the breakpoint ' + br + ' is not a function.', 'info');
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
     *
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
          log('The handler for the current breakpoint is not a function.', 'info');
        }
      }
    }
    /**
     *
     */
    function getBreakPointHandler () {
      return breakPoints[getBreakPoint()];
    }
    /**
     *
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
    // Method calling logic
    return initialize.apply(this, arguments);
  };
}));
