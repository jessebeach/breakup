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
  var plugin = 'breakUp',
  // A private reference to this $plugin object.
  $plugin,
  // Local copies of context globals (sandbox).
  document = window.document,
  navigator = window.navigator,
  location = window.location,
  // Local copy of jQuery.
  $ = window.jQuery,
  // Private variables
  html = document.documentElement,
  textDirection = (html.dir) ? html.dir : 'ltr';
  
  var currentBreak = '0';
  var breakPoints = {};
  var updated = false;
	
	/**
   *
   */
  function log (message, type) {
    if ('console' in window) {
      var type = type || 'log';
      console[type](message);
    }
  }
  /**
   * This exists because $.proxy can't be overloaded in jQuery 1.4.
   */
  function buildProxy() {
    var fn = arguments[0];
    var context = arguments[1];
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
      fn.apply(context, args);
    });
  }
  /**
  * Get the screen width.
  */
  function getScreenWidth () {
    return window.innerWidth || document.documentElement.offsetWidth || document.documentElement.clientWidth;
  }
  /**
   *
   */
  function setBreakPoints (opts) {
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
   *
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
   * Check what breakpoint the screen is in.
   */
  function breakChangeHandler (event) {
    // updated will be set to false when a new breakpoint is encountered.
    if (!updated) {
      var $this = $(this);
      var callback = getBreakPointHandler();
      if (typeof callback === 'function') {
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
  function initialize () {
    var $this = $(this);
    // Register the callbacks.
    setBreakPoints.apply($this, arguments);
    // Register a custom 'breakChanged' event on the document.
    $this.bind('breakChanged' + '.' + plugin, breakChangeHandler);
    // Register a handler on the window resize event.
    var f = buildProxy(breakCheck, $this);
    $(window).bind('resize' + '.' + plugin, f);
    $(window).bind('load' + '.' + plugin, f);
  }

  // Plugins should not declare more than one namespace in the $.fn object.
  // So we declare methods in a methods array
  var methods = {
    init : function (opts) {
      // Build main options before element iteration.
      var options = $.extend({}, $.fn[plugin].defaults, opts);
      // Strip the opts from the arguments list.
      Array.prototype.shift.call(arguments);
      // Unshift the options back into the arguments.
      Array.prototype.unshift.call(arguments, options);
      for (var i = 0; i < this.length; i++) {
        initialize.apply(this[i], arguments);
      }
      // Return the original jQuery set.
      return this;
    },
    destroy : function () {},
    unset: function () {}
  };

  // Add the plugin as a property of the jQuery fn object.
  $plugin = $.fn[plugin] = function (method) {      
    // Method calling logic
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    }
    else if (typeof method === 'object' || ! method) {
      return methods.init.apply(this, arguments);
    }
    else {
      $.error('Method ' +  method + ' does not exist on jQuery.' + plugin);
    }
  };
		
	// plugin defaults
	$.fn[plugin].defaults = {
  	'default': $.noop
	};
}));
