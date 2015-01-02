/**
 * This file is part of aqlame bus.
 *
 * aqlame bus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * aqlame bus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with aqlame bus.  If not, see <http://www.gnu.org/licenses/>.
 */

(function (def) {
    var defer=typeof defer === 'function'?defer: _.defer;
    def('bus', [], function () {
        var evContext = function () {
            this.list = [];
            this.children=[];
            this.data = {};
        };
        evContext.prototype = {
            set: function (name, value) {
                propagateChangeEvent=function(p){
                    if (p.events)
                        p.events.send(name + '/changed', value, 'evContext.set');
                    p.children.forEach(propagateChangeEvent);
                }
                if(this.data[name]!=value)
                    propagateChangeEvent(this);
                this.data[name] = value;
            },
            get: function (name) {
                if (name == 'context')
                    return this;
                var parent = this;
                while (parent) {
                    if (parent.data.hasOwnProperty(name))
                        return parent.data[name];
                    parent = parent.parent;
                }
                return undefined;
            },
            change: function (name, value) {
                var parent = this;
                while (parent) {
                    if (parent.data.hasOwnProperty(name))
                        return parent.set(name, value);
                    parent = parent.parent;
                }
                this.set(name, value);  // final resort
            },
            add: function (bus, evId) {
                if (arguments.length == 1)
                    this.list.push([bus]);
                else
                    this.list.push([bus, evId]);
            },
            createSub: function () {
                var sub = new evContext();
                sub.parent = this;
                this.children.push(sub);
                return sub;
            },
            release: function () {
                this.list.forEach(function (i) {
                    if (i.length == 2 && i[0].unRegister)
                        i[0].unRegister(i[1]);
                    else if (i[0].release)
                        i[0].release();
                });
                this.children.forEach(function (i) {
                    i.release();
                    i.parent=undefined;
                });
                this.list = [];
                this.children = [];
                if(this.events)this.events.clear();
            },
            onChange: function (name, cb, context) {
                if (!this.events)this.events = new busData();
                return this.events.register(name + '/changed', cb, context);
            },
            onLoad: function (name, cb, context) {
                cb();
                return null;
            },
            isLoaded: function (name) {
                return true;
            }
        };

        var stack = [];

        function pushEvent(bus, subject, message, source) {
            stack.push({b: bus, s: subject, m: message, so: source});
            if (stack.length == 1) {
                defer(function () {
                    while (stack.length) {
                        i = stack.shift();
                        i.b._send(i.s, i.m, i.so);
                    }
                });
            }
        }

        var busData = function () {
            this.registry = {};
        };
        busData.prototype = {
            LOGIN: 'blink/login',			// Login status has changed event
            LOGIN_CANCEL: 'blink/login/cancel',			// Login dialog was cancelled
            REQUEST_LOGIN: 'blink/request_login',	// Request login dialog
            SERVER_REQUEST_FAILED: 'server/request/failed',		// Connection with the server failed event
            SERVER_FAILED_FLUSH: 'server/failed/flush',			// Ignore failed request
            SERVER_FAILED_RESEND: 'server/failed/resend',		// Resend failed requests
            SERVER_REQUEST_STARTED: 'server/request/started',	// A server request was initiated event
            SERVER_REQUEST_CLOSED: 'server/request/closed',		// A server request was closed event

            createContext: function () {
                return new evContext();
            },
            createSub: function (base) {
                var sub = new busData();
                sub.base = base;
                sub.parent = this;

                return sub;
            },
            register: function (subject, cb, evContext) {
                var id = _.uniqueId('bus');
                //console.log('Bus register for ['+subject+']');
                if (evContext)
                    evContext.add(this, id);

                var entry = {
                    cb: cb,
                    id: id
                };
                if (this.registry[subject] == undefined)
                    this.registry[subject] = [entry];
                else
                    this.registry[subject].push(entry);
                return id;
            },
            unRegister: function (registerId) {
                if (!registerId)
                    return;
                var self = this;
                _.defer(function () {
                    _.each(self.registry, function (regs) {
                        for (var i = 0; i < regs.length; i++) {
                            if (regs[i].id == registerId) {
                                regs.splice(i, 1);
                                break;
                            }
                        }
                    });
                });
            },
            send: function (subject, message, source) {
                pushEvent(this, subject, message, source);
            },
            _send: function (subject, message, source) {
                var registry = this.registry;
                [subject, '*'].forEach(function (key) {
                    var regs = registry[key];

                    if (regs)
                        regs.forEach(function (entry) {
                            entry.cb.call({
                                next: function (cb) {
                                    cb.call(this, entry.id, message, subject, source);
                                }
                            }, entry.id, message, subject, source);
                        });
                });

                if (this.parent)
                    this.parent._send(this.base + '/' + subject, message, source);
            },
            clear: function () {
                this.registry = {};
            }
        };

        return new busData();
    });
}(
    // wrapper to run code everywhere
        typeof define === 'function' && define.amd ?
        //AMD
        function (name, deps, factory) {
            define(deps, factory); //registering as an unnamed module, more flexible and match CommonJS
        } :
        (typeof require === 'function' && typeof module !== 'undefined' && module.exports ?
            //CommonJS
            function (deps, factory) {
                module.exports = factory.apply(this, deps.map(require));
            } :
            //Browser (regular script tag)
            function (name, deps, factory) {
                var d, i = 0, global = this, old = global[name], mod;
                while (d = deps[i]) {
                    deps[i++] = this[d];
                }
                global[name] = mod = factory.apply(global, deps);
                mod.noConflict = function () {
                    global[name] = old;
                    return mod;
                };
            }
        )
));
