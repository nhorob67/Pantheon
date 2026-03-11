import {
  __commonJS,
  __name,
  __require,
  init_esm
} from "./chunk-262SQFPS.mjs";

// node_modules/pusher-js/dist/node/pusher.js
var require_pusher = __commonJS({
  "node_modules/pusher-js/dist/node/pusher.js"(exports, module) {
    init_esm();
    module.exports = /******/
    function(modules) {
      var installedModules = {};
      function __webpack_require__(moduleId) {
        if (installedModules[moduleId]) {
          return installedModules[moduleId].exports;
        }
        var module2 = installedModules[moduleId] = {
          /******/
          i: moduleId,
          /******/
          l: false,
          /******/
          exports: {}
          /******/
        };
        modules[moduleId].call(module2.exports, module2, module2.exports, __webpack_require__);
        module2.l = true;
        return module2.exports;
      }
      __name(__webpack_require__, "__webpack_require__");
      __webpack_require__.m = modules;
      __webpack_require__.c = installedModules;
      __webpack_require__.d = function(exports2, name, getter) {
        if (!__webpack_require__.o(exports2, name)) {
          Object.defineProperty(exports2, name, { enumerable: true, get: getter });
        }
      };
      __webpack_require__.r = function(exports2) {
        if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
          Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
        }
        Object.defineProperty(exports2, "__esModule", { value: true });
      };
      __webpack_require__.t = function(value, mode) {
        if (mode & 1) value = __webpack_require__(value);
        if (mode & 8) return value;
        if (mode & 4 && typeof value === "object" && value && value.__esModule) return value;
        var ns = /* @__PURE__ */ Object.create(null);
        __webpack_require__.r(ns);
        Object.defineProperty(ns, "default", { enumerable: true, value });
        if (mode & 2 && typeof value != "string") for (var key in value) __webpack_require__.d(ns, key, function(key2) {
          return value[key2];
        }.bind(null, key));
        return ns;
      };
      __webpack_require__.n = function(module2) {
        var getter = module2 && module2.__esModule ? (
          /******/
          /* @__PURE__ */ __name(function getDefault() {
            return module2["default"];
          }, "getDefault")
        ) : (
          /******/
          /* @__PURE__ */ __name(function getModuleExports() {
            return module2;
          }, "getModuleExports")
        );
        __webpack_require__.d(getter, "a", getter);
        return getter;
      };
      __webpack_require__.o = function(object, property) {
        return Object.prototype.hasOwnProperty.call(object, property);
      };
      __webpack_require__.p = "";
      return __webpack_require__(__webpack_require__.s = 21);
    }([
      /* 0 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("util");
      },
      /* 1 */
      /***/
      function(module2, exports2, __webpack_require__) {
        var buffer = __webpack_require__(22);
        var Buffer2 = buffer.Buffer;
        function copyProps(src, dst) {
          for (var key in src) {
            dst[key] = src[key];
          }
        }
        __name(copyProps, "copyProps");
        if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
          module2.exports = buffer;
        } else {
          copyProps(buffer, exports2);
          exports2.Buffer = SafeBuffer;
        }
        function SafeBuffer(arg, encodingOrOffset, length) {
          return Buffer2(arg, encodingOrOffset, length);
        }
        __name(SafeBuffer, "SafeBuffer");
        copyProps(Buffer2, SafeBuffer);
        SafeBuffer.from = function(arg, encodingOrOffset, length) {
          if (typeof arg === "number") {
            throw new TypeError("Argument must not be a number");
          }
          return Buffer2(arg, encodingOrOffset, length);
        };
        SafeBuffer.alloc = function(size, fill, encoding) {
          if (typeof size !== "number") {
            throw new TypeError("Argument must be a number");
          }
          var buf = Buffer2(size);
          if (fill !== void 0) {
            if (typeof encoding === "string") {
              buf.fill(fill, encoding);
            } else {
              buf.fill(fill);
            }
          } else {
            buf.fill(0);
          }
          return buf;
        };
        SafeBuffer.allocUnsafe = function(size) {
          if (typeof size !== "number") {
            throw new TypeError("Argument must be a number");
          }
          return Buffer2(size);
        };
        SafeBuffer.allocUnsafeSlow = function(size) {
          if (typeof size !== "number") {
            throw new TypeError("Argument must be a number");
          }
          return buffer.SlowBuffer(size);
        };
      },
      /* 2 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Buffer2 = __webpack_require__(1).Buffer, Emitter = __webpack_require__(23).EventEmitter, util = __webpack_require__(0), streams = __webpack_require__(24), Headers = __webpack_require__(9), Reader = __webpack_require__(25);
        var Base = /* @__PURE__ */ __name(function(request, url, options) {
          Emitter.call(this);
          Base.validateOptions(options || {}, ["maxLength", "masking", "requireMasking", "protocols"]);
          this._request = request;
          this._reader = new Reader();
          this._options = options || {};
          this._maxLength = this._options.maxLength || this.MAX_LENGTH;
          this._headers = new Headers();
          this.__queue = [];
          this.readyState = 0;
          this.url = url;
          this.io = new streams.IO(this);
          this.messages = new streams.Messages(this);
          this._bindEventListeners();
        }, "Base");
        util.inherits(Base, Emitter);
        Base.isWebSocket = function(request) {
          var connection = request.headers.connection || "", upgrade = request.headers.upgrade || "";
          return request.method === "GET" && connection.toLowerCase().split(/ *, */).indexOf("upgrade") >= 0 && upgrade.toLowerCase() === "websocket";
        };
        Base.validateOptions = function(options, validKeys) {
          for (var key2 in options) {
            if (validKeys.indexOf(key2) < 0)
              throw new Error("Unrecognized option: " + key2);
          }
        };
        var instance = {
          // This is 64MB, small enough for an average VPS to handle without
          // crashing from process out of memory
          MAX_LENGTH: 67108863,
          STATES: ["connecting", "open", "closing", "closed"],
          _bindEventListeners: /* @__PURE__ */ __name(function() {
            var self2 = this;
            this.messages.on("error", function() {
            });
            this.on("message", function(event) {
              var messages = self2.messages;
              if (messages.readable) messages.emit("data", event.data);
            });
            this.on("error", function(error) {
              var messages = self2.messages;
              if (messages.readable) messages.emit("error", error);
            });
            this.on("close", function() {
              var messages = self2.messages;
              if (!messages.readable) return;
              messages.readable = messages.writable = false;
              messages.emit("end");
            });
          }, "_bindEventListeners"),
          getState: /* @__PURE__ */ __name(function() {
            return this.STATES[this.readyState] || null;
          }, "getState"),
          addExtension: /* @__PURE__ */ __name(function(extension) {
            return false;
          }, "addExtension"),
          setHeader: /* @__PURE__ */ __name(function(name, value) {
            if (this.readyState > 0) return false;
            this._headers.set(name, value);
            return true;
          }, "setHeader"),
          start: /* @__PURE__ */ __name(function() {
            if (this.readyState !== 0) return false;
            if (!Base.isWebSocket(this._request))
              return this._failHandshake(new Error("Not a WebSocket request"));
            var response;
            try {
              response = this._handshakeResponse();
            } catch (error) {
              return this._failHandshake(error);
            }
            this._write(response);
            if (this._stage !== -1) this._open();
            return true;
          }, "start"),
          _failHandshake: /* @__PURE__ */ __name(function(error) {
            var headers = new Headers();
            headers.set("Content-Type", "text/plain");
            headers.set("Content-Length", Buffer2.byteLength(error.message, "utf8"));
            headers = ["HTTP/1.1 400 Bad Request", headers.toString(), error.message];
            this._write(Buffer2.from(headers.join("\r\n"), "utf8"));
            this._fail("protocol_error", error.message);
            return false;
          }, "_failHandshake"),
          text: /* @__PURE__ */ __name(function(message) {
            return this.frame(message);
          }, "text"),
          binary: /* @__PURE__ */ __name(function(message) {
            return false;
          }, "binary"),
          ping: /* @__PURE__ */ __name(function() {
            return false;
          }, "ping"),
          pong: /* @__PURE__ */ __name(function() {
            return false;
          }, "pong"),
          close: /* @__PURE__ */ __name(function(reason, code) {
            if (this.readyState !== 1) return false;
            this.readyState = 3;
            this.emit("close", new Base.CloseEvent(null, null));
            return true;
          }, "close"),
          _open: /* @__PURE__ */ __name(function() {
            this.readyState = 1;
            this.__queue.forEach(function(args) {
              this.frame.apply(this, args);
            }, this);
            this.__queue = [];
            this.emit("open", new Base.OpenEvent());
          }, "_open"),
          _queue: /* @__PURE__ */ __name(function(message) {
            this.__queue.push(message);
            return true;
          }, "_queue"),
          _write: /* @__PURE__ */ __name(function(chunk) {
            var io = this.io;
            if (io.readable) io.emit("data", chunk);
          }, "_write"),
          _fail: /* @__PURE__ */ __name(function(type, message) {
            this.readyState = 2;
            this.emit("error", new Error(message));
            this.close();
          }, "_fail")
        };
        for (var key in instance)
          Base.prototype[key] = instance[key];
        Base.ConnectEvent = function() {
        };
        Base.OpenEvent = function() {
        };
        Base.CloseEvent = function(code, reason) {
          this.code = code;
          this.reason = reason;
        };
        Base.MessageEvent = function(data) {
          this.data = data;
        };
        Base.PingEvent = function(data) {
          this.data = data;
        };
        Base.PongEvent = function(data) {
          this.data = data;
        };
        module2.exports = Base;
      },
      /* 3 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("crypto");
      },
      /* 4 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Base = __webpack_require__(2), Client = __webpack_require__(26), Server = __webpack_require__(37);
        var Driver = {
          client: /* @__PURE__ */ __name(function(url, options) {
            options = options || {};
            if (options.masking === void 0) options.masking = true;
            return new Client(url, options);
          }, "client"),
          server: /* @__PURE__ */ __name(function(options) {
            options = options || {};
            if (options.requireMasking === void 0) options.requireMasking = true;
            return new Server(options);
          }, "server"),
          http: /* @__PURE__ */ __name(function() {
            return Server.http.apply(Server, arguments);
          }, "http"),
          isSecureRequest: /* @__PURE__ */ __name(function(request) {
            return Server.isSecureRequest(request);
          }, "isSecureRequest"),
          isWebSocket: /* @__PURE__ */ __name(function(request) {
            return Base.isWebSocket(request);
          }, "isWebSocket"),
          validateOptions: /* @__PURE__ */ __name(function(options, validKeys) {
            Base.validateOptions(options, validKeys);
          }, "validateOptions")
        };
        module2.exports = Driver;
      },
      /* 5 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("stream");
      },
      /* 6 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("url");
      },
      /* 7 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Event = /* @__PURE__ */ __name(function(eventType, options) {
          this.type = eventType;
          for (var key in options)
            this[key] = options[key];
        }, "Event");
        Event.prototype.initEvent = function(eventType, canBubble, cancelable) {
          this.type = eventType;
          this.bubbles = canBubble;
          this.cancelable = cancelable;
        };
        Event.prototype.stopPropagation = function() {
        };
        Event.prototype.preventDefault = function() {
        };
        Event.CAPTURING_PHASE = 1;
        Event.AT_TARGET = 2;
        Event.BUBBLING_PHASE = 3;
        module2.exports = Event;
      },
      /* 8 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var __extends = this && this.__extends || /* @__PURE__ */ function() {
          var extendStatics = /* @__PURE__ */ __name(function(d, b) {
            extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
              d2.__proto__ = b2;
            } || function(d2, b2) {
              for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
            };
            return extendStatics(d, b);
          }, "extendStatics");
          return function(d, b) {
            extendStatics(d, b);
            function __() {
              this.constructor = d;
            }
            __name(__, "__");
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
          };
        }();
        Object.defineProperty(exports2, "__esModule", { value: true });
        var INVALID_BYTE = 256;
        var Coder = (
          /** @class */
          function() {
            function Coder2(_paddingCharacter) {
              if (_paddingCharacter === void 0) {
                _paddingCharacter = "=";
              }
              this._paddingCharacter = _paddingCharacter;
            }
            __name(Coder2, "Coder");
            Coder2.prototype.encodedLength = function(length) {
              if (!this._paddingCharacter) {
                return (length * 8 + 5) / 6 | 0;
              }
              return (length + 2) / 3 * 4 | 0;
            };
            Coder2.prototype.encode = function(data) {
              var out = "";
              var i = 0;
              for (; i < data.length - 2; i += 3) {
                var c = data[i] << 16 | data[i + 1] << 8 | data[i + 2];
                out += this._encodeByte(c >>> 3 * 6 & 63);
                out += this._encodeByte(c >>> 2 * 6 & 63);
                out += this._encodeByte(c >>> 1 * 6 & 63);
                out += this._encodeByte(c >>> 0 * 6 & 63);
              }
              var left = data.length - i;
              if (left > 0) {
                var c = data[i] << 16 | (left === 2 ? data[i + 1] << 8 : 0);
                out += this._encodeByte(c >>> 3 * 6 & 63);
                out += this._encodeByte(c >>> 2 * 6 & 63);
                if (left === 2) {
                  out += this._encodeByte(c >>> 1 * 6 & 63);
                } else {
                  out += this._paddingCharacter || "";
                }
                out += this._paddingCharacter || "";
              }
              return out;
            };
            Coder2.prototype.maxDecodedLength = function(length) {
              if (!this._paddingCharacter) {
                return (length * 6 + 7) / 8 | 0;
              }
              return length / 4 * 3 | 0;
            };
            Coder2.prototype.decodedLength = function(s) {
              return this.maxDecodedLength(s.length - this._getPaddingLength(s));
            };
            Coder2.prototype.decode = function(s) {
              if (s.length === 0) {
                return new Uint8Array(0);
              }
              var paddingLength = this._getPaddingLength(s);
              var length = s.length - paddingLength;
              var out = new Uint8Array(this.maxDecodedLength(length));
              var op = 0;
              var i = 0;
              var haveBad = 0;
              var v0 = 0, v1 = 0, v2 = 0, v3 = 0;
              for (; i < length - 4; i += 4) {
                v0 = this._decodeChar(s.charCodeAt(i + 0));
                v1 = this._decodeChar(s.charCodeAt(i + 1));
                v2 = this._decodeChar(s.charCodeAt(i + 2));
                v3 = this._decodeChar(s.charCodeAt(i + 3));
                out[op++] = v0 << 2 | v1 >>> 4;
                out[op++] = v1 << 4 | v2 >>> 2;
                out[op++] = v2 << 6 | v3;
                haveBad |= v0 & INVALID_BYTE;
                haveBad |= v1 & INVALID_BYTE;
                haveBad |= v2 & INVALID_BYTE;
                haveBad |= v3 & INVALID_BYTE;
              }
              if (i < length - 1) {
                v0 = this._decodeChar(s.charCodeAt(i));
                v1 = this._decodeChar(s.charCodeAt(i + 1));
                out[op++] = v0 << 2 | v1 >>> 4;
                haveBad |= v0 & INVALID_BYTE;
                haveBad |= v1 & INVALID_BYTE;
              }
              if (i < length - 2) {
                v2 = this._decodeChar(s.charCodeAt(i + 2));
                out[op++] = v1 << 4 | v2 >>> 2;
                haveBad |= v2 & INVALID_BYTE;
              }
              if (i < length - 3) {
                v3 = this._decodeChar(s.charCodeAt(i + 3));
                out[op++] = v2 << 6 | v3;
                haveBad |= v3 & INVALID_BYTE;
              }
              if (haveBad !== 0) {
                throw new Error("Base64Coder: incorrect characters for decoding");
              }
              return out;
            };
            Coder2.prototype._encodeByte = function(b) {
              var result = b;
              result += 65;
              result += 25 - b >>> 8 & 0 - 65 - 26 + 97;
              result += 51 - b >>> 8 & 26 - 97 - 52 + 48;
              result += 61 - b >>> 8 & 52 - 48 - 62 + 43;
              result += 62 - b >>> 8 & 62 - 43 - 63 + 47;
              return String.fromCharCode(result);
            };
            Coder2.prototype._decodeChar = function(c) {
              var result = INVALID_BYTE;
              result += (42 - c & c - 44) >>> 8 & -INVALID_BYTE + c - 43 + 62;
              result += (46 - c & c - 48) >>> 8 & -INVALID_BYTE + c - 47 + 63;
              result += (47 - c & c - 58) >>> 8 & -INVALID_BYTE + c - 48 + 52;
              result += (64 - c & c - 91) >>> 8 & -INVALID_BYTE + c - 65 + 0;
              result += (96 - c & c - 123) >>> 8 & -INVALID_BYTE + c - 97 + 26;
              return result;
            };
            Coder2.prototype._getPaddingLength = function(s) {
              var paddingLength = 0;
              if (this._paddingCharacter) {
                for (var i = s.length - 1; i >= 0; i--) {
                  if (s[i] !== this._paddingCharacter) {
                    break;
                  }
                  paddingLength++;
                }
                if (s.length < 4 || paddingLength > 2) {
                  throw new Error("Base64Coder: incorrect padding");
                }
              }
              return paddingLength;
            };
            return Coder2;
          }()
        );
        exports2.Coder = Coder;
        var stdCoder = new Coder();
        function encode(data) {
          return stdCoder.encode(data);
        }
        __name(encode, "encode");
        exports2.encode = encode;
        function decode(s) {
          return stdCoder.decode(s);
        }
        __name(decode, "decode");
        exports2.decode = decode;
        var URLSafeCoder = (
          /** @class */
          function(_super) {
            __extends(URLSafeCoder2, _super);
            function URLSafeCoder2() {
              return _super !== null && _super.apply(this, arguments) || this;
            }
            __name(URLSafeCoder2, "URLSafeCoder");
            URLSafeCoder2.prototype._encodeByte = function(b) {
              var result = b;
              result += 65;
              result += 25 - b >>> 8 & 0 - 65 - 26 + 97;
              result += 51 - b >>> 8 & 26 - 97 - 52 + 48;
              result += 61 - b >>> 8 & 52 - 48 - 62 + 45;
              result += 62 - b >>> 8 & 62 - 45 - 63 + 95;
              return String.fromCharCode(result);
            };
            URLSafeCoder2.prototype._decodeChar = function(c) {
              var result = INVALID_BYTE;
              result += (44 - c & c - 46) >>> 8 & -INVALID_BYTE + c - 45 + 62;
              result += (94 - c & c - 96) >>> 8 & -INVALID_BYTE + c - 95 + 63;
              result += (47 - c & c - 58) >>> 8 & -INVALID_BYTE + c - 48 + 52;
              result += (64 - c & c - 91) >>> 8 & -INVALID_BYTE + c - 65 + 0;
              result += (96 - c & c - 123) >>> 8 & -INVALID_BYTE + c - 97 + 26;
              return result;
            };
            return URLSafeCoder2;
          }(Coder)
        );
        exports2.URLSafeCoder = URLSafeCoder;
        var urlSafeCoder = new URLSafeCoder();
        function encodeURLSafe(data) {
          return urlSafeCoder.encode(data);
        }
        __name(encodeURLSafe, "encodeURLSafe");
        exports2.encodeURLSafe = encodeURLSafe;
        function decodeURLSafe(s) {
          return urlSafeCoder.decode(s);
        }
        __name(decodeURLSafe, "decodeURLSafe");
        exports2.decodeURLSafe = decodeURLSafe;
        exports2.encodedLength = function(length) {
          return stdCoder.encodedLength(length);
        };
        exports2.maxDecodedLength = function(length) {
          return stdCoder.maxDecodedLength(length);
        };
        exports2.decodedLength = function(s) {
          return stdCoder.decodedLength(s);
        };
      },
      /* 9 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Headers = /* @__PURE__ */ __name(function() {
          this.clear();
        }, "Headers");
        Headers.prototype.ALLOWED_DUPLICATES = ["set-cookie", "set-cookie2", "warning", "www-authenticate"];
        Headers.prototype.clear = function() {
          this._sent = {};
          this._lines = [];
        };
        Headers.prototype.set = function(name, value) {
          if (value === void 0) return;
          name = this._strip(name);
          value = this._strip(value);
          var key = name.toLowerCase();
          if (!this._sent.hasOwnProperty(key) || this.ALLOWED_DUPLICATES.indexOf(key) >= 0) {
            this._sent[key] = true;
            this._lines.push(name + ": " + value + "\r\n");
          }
        };
        Headers.prototype.toString = function() {
          return this._lines.join("");
        };
        Headers.prototype._strip = function(string) {
          return string.toString().replace(/^ */, "").replace(/ *$/, "");
        };
        module2.exports = Headers;
      },
      /* 10 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var NodeHTTPParser = __webpack_require__(27).HTTPParser, Buffer2 = __webpack_require__(1).Buffer;
        var TYPES = {
          request: NodeHTTPParser.REQUEST || "request",
          response: NodeHTTPParser.RESPONSE || "response"
        };
        var HttpParser = /* @__PURE__ */ __name(function(type) {
          this._type = type;
          this._parser = new NodeHTTPParser(TYPES[type]);
          this._complete = false;
          this.headers = {};
          var current = null, self2 = this;
          this._parser.onHeaderField = function(b, start, length) {
            current = b.toString("utf8", start, start + length).toLowerCase();
          };
          this._parser.onHeaderValue = function(b, start, length) {
            var value = b.toString("utf8", start, start + length);
            if (self2.headers.hasOwnProperty(current))
              self2.headers[current] += ", " + value;
            else
              self2.headers[current] = value;
          };
          this._parser.onHeadersComplete = this._parser[NodeHTTPParser.kOnHeadersComplete] = function(majorVersion, minorVersion, headers, method, pathname, statusCode) {
            var info = arguments[0];
            if (typeof info === "object") {
              method = info.method;
              pathname = info.url;
              statusCode = info.statusCode;
              headers = info.headers;
            }
            self2.method = typeof method === "number" ? HttpParser.METHODS[method] : method;
            self2.statusCode = statusCode;
            self2.url = pathname;
            if (!headers) return;
            for (var i = 0, n = headers.length, key, value; i < n; i += 2) {
              key = headers[i].toLowerCase();
              value = headers[i + 1];
              if (self2.headers.hasOwnProperty(key))
                self2.headers[key] += ", " + value;
              else
                self2.headers[key] = value;
            }
            self2._complete = true;
          };
        }, "HttpParser");
        HttpParser.METHODS = {
          0: "DELETE",
          1: "GET",
          2: "HEAD",
          3: "POST",
          4: "PUT",
          5: "CONNECT",
          6: "OPTIONS",
          7: "TRACE",
          8: "COPY",
          9: "LOCK",
          10: "MKCOL",
          11: "MOVE",
          12: "PROPFIND",
          13: "PROPPATCH",
          14: "SEARCH",
          15: "UNLOCK",
          16: "BIND",
          17: "REBIND",
          18: "UNBIND",
          19: "ACL",
          20: "REPORT",
          21: "MKACTIVITY",
          22: "CHECKOUT",
          23: "MERGE",
          24: "M-SEARCH",
          25: "NOTIFY",
          26: "SUBSCRIBE",
          27: "UNSUBSCRIBE",
          28: "PATCH",
          29: "PURGE",
          30: "MKCALENDAR",
          31: "LINK",
          32: "UNLINK"
        };
        var VERSION = process.version ? process.version.match(/[0-9]+/g).map(function(n) {
          return parseInt(n, 10);
        }) : [];
        if (VERSION[0] === 0 && VERSION[1] === 12) {
          HttpParser.METHODS[16] = "REPORT";
          HttpParser.METHODS[17] = "MKACTIVITY";
          HttpParser.METHODS[18] = "CHECKOUT";
          HttpParser.METHODS[19] = "MERGE";
          HttpParser.METHODS[20] = "M-SEARCH";
          HttpParser.METHODS[21] = "NOTIFY";
          HttpParser.METHODS[22] = "SUBSCRIBE";
          HttpParser.METHODS[23] = "UNSUBSCRIBE";
          HttpParser.METHODS[24] = "PATCH";
          HttpParser.METHODS[25] = "PURGE";
        }
        HttpParser.prototype.isComplete = function() {
          return this._complete;
        };
        HttpParser.prototype.parse = function(chunk) {
          var consumed = this._parser.execute(chunk, 0, chunk.length);
          if (typeof consumed !== "number") {
            this.error = consumed;
            this._complete = true;
            return;
          }
          if (this._complete)
            this.body = consumed < chunk.length ? chunk.slice(consumed) : Buffer2.alloc(0);
        };
        module2.exports = HttpParser;
      },
      /* 11 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Stream = __webpack_require__(5).Stream, util = __webpack_require__(0), driver = __webpack_require__(4), EventTarget = __webpack_require__(16), Event = __webpack_require__(7);
        var API = /* @__PURE__ */ __name(function(options) {
          options = options || {};
          driver.validateOptions(options, ["headers", "extensions", "maxLength", "ping", "proxy", "tls", "ca"]);
          this.readable = this.writable = true;
          var headers = options.headers;
          if (headers) {
            for (var name in headers) this._driver.setHeader(name, headers[name]);
          }
          var extensions = options.extensions;
          if (extensions) {
            [].concat(extensions).forEach(this._driver.addExtension, this._driver);
          }
          this._ping = options.ping;
          this._pingId = 0;
          this.readyState = API.CONNECTING;
          this.bufferedAmount = 0;
          this.protocol = "";
          this.url = this._driver.url;
          this.version = this._driver.version;
          var self2 = this;
          this._driver.on("open", function(e) {
            self2._open();
          });
          this._driver.on("message", function(e) {
            self2._receiveMessage(e.data);
          });
          this._driver.on("close", function(e) {
            self2._beginClose(e.reason, e.code);
          });
          this._driver.on("error", function(error) {
            self2._emitError(error.message);
          });
          this.on("error", function() {
          });
          this._driver.messages.on("drain", function() {
            self2.emit("drain");
          });
          if (this._ping)
            this._pingTimer = setInterval(function() {
              self2._pingId += 1;
              self2.ping(self2._pingId.toString());
            }, this._ping * 1e3);
          this._configureStream();
          if (!this._proxy) {
            this._stream.pipe(this._driver.io);
            this._driver.io.pipe(this._stream);
          }
        }, "API");
        util.inherits(API, Stream);
        API.CONNECTING = 0;
        API.OPEN = 1;
        API.CLOSING = 2;
        API.CLOSED = 3;
        API.CLOSE_TIMEOUT = 3e4;
        var instance = {
          write: /* @__PURE__ */ __name(function(data) {
            return this.send(data);
          }, "write"),
          end: /* @__PURE__ */ __name(function(data) {
            if (data !== void 0) this.send(data);
            this.close();
          }, "end"),
          pause: /* @__PURE__ */ __name(function() {
            return this._driver.messages.pause();
          }, "pause"),
          resume: /* @__PURE__ */ __name(function() {
            return this._driver.messages.resume();
          }, "resume"),
          send: /* @__PURE__ */ __name(function(data) {
            if (this.readyState > API.OPEN) return false;
            if (!(data instanceof Buffer)) data = String(data);
            return this._driver.messages.write(data);
          }, "send"),
          ping: /* @__PURE__ */ __name(function(message, callback) {
            if (this.readyState > API.OPEN) return false;
            return this._driver.ping(message, callback);
          }, "ping"),
          close: /* @__PURE__ */ __name(function(code, reason) {
            if (code === void 0) code = 1e3;
            if (reason === void 0) reason = "";
            if (code !== 1e3 && (code < 3e3 || code > 4999))
              throw new Error("Failed to execute 'close' on WebSocket: The code must be either 1000, or between 3000 and 4999. " + code + " is neither.");
            if (this.readyState !== API.CLOSED) this.readyState = API.CLOSING;
            var self2 = this;
            this._closeTimer = setTimeout(function() {
              self2._beginClose("", 1006);
            }, API.CLOSE_TIMEOUT);
            this._driver.close(reason, code);
          }, "close"),
          _configureStream: /* @__PURE__ */ __name(function() {
            var self2 = this;
            this._stream.setTimeout(0);
            this._stream.setNoDelay(true);
            ["close", "end"].forEach(function(event) {
              this._stream.on(event, function() {
                self2._finalizeClose();
              });
            }, this);
            this._stream.on("error", function(error) {
              self2._emitError("Network error: " + self2.url + ": " + error.message);
              self2._finalizeClose();
            });
          }, "_configureStream"),
          _open: /* @__PURE__ */ __name(function() {
            if (this.readyState !== API.CONNECTING) return;
            this.readyState = API.OPEN;
            this.protocol = this._driver.protocol || "";
            var event = new Event("open");
            event.initEvent("open", false, false);
            this.dispatchEvent(event);
          }, "_open"),
          _receiveMessage: /* @__PURE__ */ __name(function(data) {
            if (this.readyState > API.OPEN) return false;
            if (this.readable) this.emit("data", data);
            var event = new Event("message", { data });
            event.initEvent("message", false, false);
            this.dispatchEvent(event);
          }, "_receiveMessage"),
          _emitError: /* @__PURE__ */ __name(function(message) {
            if (this.readyState >= API.CLOSING) return;
            var event = new Event("error", { message });
            event.initEvent("error", false, false);
            this.dispatchEvent(event);
          }, "_emitError"),
          _beginClose: /* @__PURE__ */ __name(function(reason, code) {
            if (this.readyState === API.CLOSED) return;
            this.readyState = API.CLOSING;
            this._closeParams = [reason, code];
            if (this._stream) {
              this._stream.destroy();
              if (!this._stream.readable) this._finalizeClose();
            }
          }, "_beginClose"),
          _finalizeClose: /* @__PURE__ */ __name(function() {
            if (this.readyState === API.CLOSED) return;
            this.readyState = API.CLOSED;
            if (this._closeTimer) clearTimeout(this._closeTimer);
            if (this._pingTimer) clearInterval(this._pingTimer);
            if (this._stream) this._stream.end();
            if (this.readable) this.emit("end");
            this.readable = this.writable = false;
            var reason = this._closeParams ? this._closeParams[0] : "", code = this._closeParams ? this._closeParams[1] : 1006;
            var event = new Event("close", { code, reason });
            event.initEvent("close", false, false);
            this.dispatchEvent(event);
          }, "_finalizeClose")
        };
        for (var method in instance) API.prototype[method] = instance[method];
        for (var key in EventTarget) API.prototype[key] = EventTarget[key];
        module2.exports = API;
      },
      /* 12 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Buffer2 = __webpack_require__(1).Buffer, crypto = __webpack_require__(3), util = __webpack_require__(0), Extensions = __webpack_require__(29), Base = __webpack_require__(2), Frame = __webpack_require__(34), Message = __webpack_require__(35);
        var Hybi = /* @__PURE__ */ __name(function(request, url, options) {
          Base.apply(this, arguments);
          this._extensions = new Extensions();
          this._stage = 0;
          this._masking = this._options.masking;
          this._protocols = this._options.protocols || [];
          this._requireMasking = this._options.requireMasking;
          this._pingCallbacks = {};
          if (typeof this._protocols === "string")
            this._protocols = this._protocols.split(/ *, */);
          if (!this._request) return;
          var protos = this._request.headers["sec-websocket-protocol"], supported = this._protocols;
          if (protos !== void 0) {
            if (typeof protos === "string") protos = protos.split(/ *, */);
            this.protocol = protos.filter(function(p) {
              return supported.indexOf(p) >= 0;
            })[0];
          }
          this.version = "hybi-" + Hybi.VERSION;
        }, "Hybi");
        util.inherits(Hybi, Base);
        Hybi.VERSION = "13";
        Hybi.mask = function(payload, mask, offset) {
          if (!mask || mask.length === 0) return payload;
          offset = offset || 0;
          for (var i = 0, n = payload.length - offset; i < n; i++) {
            payload[offset + i] = payload[offset + i] ^ mask[i % 4];
          }
          return payload;
        };
        Hybi.generateAccept = function(key2) {
          var sha1 = crypto.createHash("sha1");
          sha1.update(key2 + Hybi.GUID);
          return sha1.digest("base64");
        };
        Hybi.GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
        var instance = {
          FIN: 128,
          MASK: 128,
          RSV1: 64,
          RSV2: 32,
          RSV3: 16,
          OPCODE: 15,
          LENGTH: 127,
          OPCODES: {
            continuation: 0,
            text: 1,
            binary: 2,
            close: 8,
            ping: 9,
            pong: 10
          },
          OPCODE_CODES: [0, 1, 2, 8, 9, 10],
          MESSAGE_OPCODES: [0, 1, 2],
          OPENING_OPCODES: [1, 2],
          ERRORS: {
            normal_closure: 1e3,
            going_away: 1001,
            protocol_error: 1002,
            unacceptable: 1003,
            encoding_error: 1007,
            policy_violation: 1008,
            too_large: 1009,
            extension_error: 1010,
            unexpected_condition: 1011
          },
          ERROR_CODES: [1e3, 1001, 1002, 1003, 1007, 1008, 1009, 1010, 1011],
          DEFAULT_ERROR_CODE: 1e3,
          MIN_RESERVED_ERROR: 3e3,
          MAX_RESERVED_ERROR: 4999,
          // http://www.w3.org/International/questions/qa-forms-utf-8.en.php
          UTF8_MATCH: /^([\x00-\x7F]|[\xC2-\xDF][\x80-\xBF]|\xE0[\xA0-\xBF][\x80-\xBF]|[\xE1-\xEC\xEE\xEF][\x80-\xBF]{2}|\xED[\x80-\x9F][\x80-\xBF]|\xF0[\x90-\xBF][\x80-\xBF]{2}|[\xF1-\xF3][\x80-\xBF]{3}|\xF4[\x80-\x8F][\x80-\xBF]{2})*$/,
          addExtension: /* @__PURE__ */ __name(function(extension) {
            this._extensions.add(extension);
            return true;
          }, "addExtension"),
          parse: /* @__PURE__ */ __name(function(chunk) {
            this._reader.put(chunk);
            var buffer = true;
            while (buffer) {
              switch (this._stage) {
                case 0:
                  buffer = this._reader.read(1);
                  if (buffer) this._parseOpcode(buffer[0]);
                  break;
                case 1:
                  buffer = this._reader.read(1);
                  if (buffer) this._parseLength(buffer[0]);
                  break;
                case 2:
                  buffer = this._reader.read(this._frame.lengthBytes);
                  if (buffer) this._parseExtendedLength(buffer);
                  break;
                case 3:
                  buffer = this._reader.read(4);
                  if (buffer) {
                    this._stage = 4;
                    this._frame.maskingKey = buffer;
                  }
                  break;
                case 4:
                  buffer = this._reader.read(this._frame.length);
                  if (buffer) {
                    this._stage = 0;
                    this._emitFrame(buffer);
                  }
                  break;
                default:
                  buffer = null;
              }
            }
          }, "parse"),
          text: /* @__PURE__ */ __name(function(message) {
            if (this.readyState > 1) return false;
            return this.frame(message, "text");
          }, "text"),
          binary: /* @__PURE__ */ __name(function(message) {
            if (this.readyState > 1) return false;
            return this.frame(message, "binary");
          }, "binary"),
          ping: /* @__PURE__ */ __name(function(message, callback) {
            if (this.readyState > 1) return false;
            message = message || "";
            if (callback) this._pingCallbacks[message] = callback;
            return this.frame(message, "ping");
          }, "ping"),
          pong: /* @__PURE__ */ __name(function(message) {
            if (this.readyState > 1) return false;
            message = message || "";
            return this.frame(message, "pong");
          }, "pong"),
          close: /* @__PURE__ */ __name(function(reason, code) {
            reason = reason || "";
            code = code || this.ERRORS.normal_closure;
            if (this.readyState <= 0) {
              this.readyState = 3;
              this.emit("close", new Base.CloseEvent(code, reason));
              return true;
            } else if (this.readyState === 1) {
              this.readyState = 2;
              this._extensions.close(function() {
                this.frame(reason, "close", code);
              }, this);
              return true;
            } else {
              return false;
            }
          }, "close"),
          frame: /* @__PURE__ */ __name(function(buffer, type, code) {
            if (this.readyState <= 0) return this._queue([buffer, type, code]);
            if (this.readyState > 2) return false;
            if (buffer instanceof Array) buffer = Buffer2.from(buffer);
            if (typeof buffer === "number") buffer = buffer.toString();
            var message = new Message(), isText = typeof buffer === "string", payload, copy;
            message.rsv1 = message.rsv2 = message.rsv3 = false;
            message.opcode = this.OPCODES[type || (isText ? "text" : "binary")];
            payload = isText ? Buffer2.from(buffer, "utf8") : buffer;
            if (code) {
              copy = payload;
              payload = Buffer2.allocUnsafe(2 + copy.length);
              payload.writeUInt16BE(code, 0);
              copy.copy(payload, 2);
            }
            message.data = payload;
            var onMessageReady = /* @__PURE__ */ __name(function(message2) {
              var frame = new Frame();
              frame.final = true;
              frame.rsv1 = message2.rsv1;
              frame.rsv2 = message2.rsv2;
              frame.rsv3 = message2.rsv3;
              frame.opcode = message2.opcode;
              frame.masked = !!this._masking;
              frame.length = message2.data.length;
              frame.payload = message2.data;
              if (frame.masked) frame.maskingKey = crypto.randomBytes(4);
              this._sendFrame(frame);
            }, "onMessageReady");
            if (this.MESSAGE_OPCODES.indexOf(message.opcode) >= 0)
              this._extensions.processOutgoingMessage(message, function(error, message2) {
                if (error) return this._fail("extension_error", error.message);
                onMessageReady.call(this, message2);
              }, this);
            else
              onMessageReady.call(this, message);
            return true;
          }, "frame"),
          _sendFrame: /* @__PURE__ */ __name(function(frame) {
            var length = frame.length, header = length <= 125 ? 2 : length <= 65535 ? 4 : 10, offset = header + (frame.masked ? 4 : 0), buffer = Buffer2.allocUnsafe(offset + length), masked = frame.masked ? this.MASK : 0;
            buffer[0] = (frame.final ? this.FIN : 0) | (frame.rsv1 ? this.RSV1 : 0) | (frame.rsv2 ? this.RSV2 : 0) | (frame.rsv3 ? this.RSV3 : 0) | frame.opcode;
            if (length <= 125) {
              buffer[1] = masked | length;
            } else if (length <= 65535) {
              buffer[1] = masked | 126;
              buffer.writeUInt16BE(length, 2);
            } else {
              buffer[1] = masked | 127;
              buffer.writeUInt32BE(Math.floor(length / 4294967296), 2);
              buffer.writeUInt32BE(length % 4294967296, 6);
            }
            frame.payload.copy(buffer, offset);
            if (frame.masked) {
              frame.maskingKey.copy(buffer, header);
              Hybi.mask(buffer, frame.maskingKey, offset);
            }
            this._write(buffer);
          }, "_sendFrame"),
          _handshakeResponse: /* @__PURE__ */ __name(function() {
            var secKey = this._request.headers["sec-websocket-key"], version = this._request.headers["sec-websocket-version"];
            if (version !== Hybi.VERSION)
              throw new Error("Unsupported WebSocket version: " + version);
            if (typeof secKey !== "string")
              throw new Error("Missing handshake request header: Sec-WebSocket-Key");
            this._headers.set("Upgrade", "websocket");
            this._headers.set("Connection", "Upgrade");
            this._headers.set("Sec-WebSocket-Accept", Hybi.generateAccept(secKey));
            if (this.protocol) this._headers.set("Sec-WebSocket-Protocol", this.protocol);
            var extensions = this._extensions.generateResponse(this._request.headers["sec-websocket-extensions"]);
            if (extensions) this._headers.set("Sec-WebSocket-Extensions", extensions);
            var start = "HTTP/1.1 101 Switching Protocols", headers = [start, this._headers.toString(), ""];
            return Buffer2.from(headers.join("\r\n"), "utf8");
          }, "_handshakeResponse"),
          _shutdown: /* @__PURE__ */ __name(function(code, reason, error) {
            delete this._frame;
            delete this._message;
            this._stage = 5;
            var sendCloseFrame = this.readyState === 1;
            this.readyState = 2;
            this._extensions.close(function() {
              if (sendCloseFrame) this.frame(reason, "close", code);
              this.readyState = 3;
              if (error) this.emit("error", new Error(reason));
              this.emit("close", new Base.CloseEvent(code, reason));
            }, this);
          }, "_shutdown"),
          _fail: /* @__PURE__ */ __name(function(type, message) {
            if (this.readyState > 1) return;
            this._shutdown(this.ERRORS[type], message, true);
          }, "_fail"),
          _parseOpcode: /* @__PURE__ */ __name(function(octet) {
            var rsvs = [this.RSV1, this.RSV2, this.RSV3].map(function(rsv) {
              return (octet & rsv) === rsv;
            });
            var frame = this._frame = new Frame();
            frame.final = (octet & this.FIN) === this.FIN;
            frame.rsv1 = rsvs[0];
            frame.rsv2 = rsvs[1];
            frame.rsv3 = rsvs[2];
            frame.opcode = octet & this.OPCODE;
            this._stage = 1;
            if (!this._extensions.validFrameRsv(frame))
              return this._fail(
                "protocol_error",
                "One or more reserved bits are on: reserved1 = " + (frame.rsv1 ? 1 : 0) + ", reserved2 = " + (frame.rsv2 ? 1 : 0) + ", reserved3 = " + (frame.rsv3 ? 1 : 0)
              );
            if (this.OPCODE_CODES.indexOf(frame.opcode) < 0)
              return this._fail("protocol_error", "Unrecognized frame opcode: " + frame.opcode);
            if (this.MESSAGE_OPCODES.indexOf(frame.opcode) < 0 && !frame.final)
              return this._fail("protocol_error", "Received fragmented control frame: opcode = " + frame.opcode);
            if (this._message && this.OPENING_OPCODES.indexOf(frame.opcode) >= 0)
              return this._fail("protocol_error", "Received new data frame but previous continuous frame is unfinished");
          }, "_parseOpcode"),
          _parseLength: /* @__PURE__ */ __name(function(octet) {
            var frame = this._frame;
            frame.masked = (octet & this.MASK) === this.MASK;
            frame.length = octet & this.LENGTH;
            if (frame.length >= 0 && frame.length <= 125) {
              this._stage = frame.masked ? 3 : 4;
              if (!this._checkFrameLength()) return;
            } else {
              this._stage = 2;
              frame.lengthBytes = frame.length === 126 ? 2 : 8;
            }
            if (this._requireMasking && !frame.masked)
              return this._fail("unacceptable", "Received unmasked frame but masking is required");
          }, "_parseLength"),
          _parseExtendedLength: /* @__PURE__ */ __name(function(buffer) {
            var frame = this._frame;
            frame.length = this._readUInt(buffer);
            this._stage = frame.masked ? 3 : 4;
            if (this.MESSAGE_OPCODES.indexOf(frame.opcode) < 0 && frame.length > 125)
              return this._fail("protocol_error", "Received control frame having too long payload: " + frame.length);
            if (!this._checkFrameLength()) return;
          }, "_parseExtendedLength"),
          _checkFrameLength: /* @__PURE__ */ __name(function() {
            var length = this._message ? this._message.length : 0;
            if (length + this._frame.length > this._maxLength) {
              this._fail("too_large", "WebSocket frame length too large");
              return false;
            } else {
              return true;
            }
          }, "_checkFrameLength"),
          _emitFrame: /* @__PURE__ */ __name(function(buffer) {
            var frame = this._frame, payload = frame.payload = Hybi.mask(buffer, frame.maskingKey), opcode = frame.opcode, message, code, reason, callbacks, callback;
            delete this._frame;
            if (opcode === this.OPCODES.continuation) {
              if (!this._message) return this._fail("protocol_error", "Received unexpected continuation frame");
              this._message.pushFrame(frame);
            }
            if (opcode === this.OPCODES.text || opcode === this.OPCODES.binary) {
              this._message = new Message();
              this._message.pushFrame(frame);
            }
            if (frame.final && this.MESSAGE_OPCODES.indexOf(opcode) >= 0)
              return this._emitMessage(this._message);
            if (opcode === this.OPCODES.close) {
              code = payload.length >= 2 ? payload.readUInt16BE(0) : null;
              reason = payload.length > 2 ? this._encode(payload.slice(2)) : null;
              if (!(payload.length === 0) && !(code !== null && code >= this.MIN_RESERVED_ERROR && code <= this.MAX_RESERVED_ERROR) && this.ERROR_CODES.indexOf(code) < 0)
                code = this.ERRORS.protocol_error;
              if (payload.length > 125 || payload.length > 2 && !reason)
                code = this.ERRORS.protocol_error;
              this._shutdown(code || this.DEFAULT_ERROR_CODE, reason || "");
            }
            if (opcode === this.OPCODES.ping) {
              this.frame(payload, "pong");
              this.emit("ping", new Base.PingEvent(payload.toString()));
            }
            if (opcode === this.OPCODES.pong) {
              callbacks = this._pingCallbacks;
              message = this._encode(payload);
              callback = callbacks[message];
              delete callbacks[message];
              if (callback) callback();
              this.emit("pong", new Base.PongEvent(payload.toString()));
            }
          }, "_emitFrame"),
          _emitMessage: /* @__PURE__ */ __name(function(message) {
            var message = this._message;
            message.read();
            delete this._message;
            this._extensions.processIncomingMessage(message, function(error, message2) {
              if (error) return this._fail("extension_error", error.message);
              var payload = message2.data;
              if (message2.opcode === this.OPCODES.text) payload = this._encode(payload);
              if (payload === null)
                return this._fail("encoding_error", "Could not decode a text frame as UTF-8");
              else
                this.emit("message", new Base.MessageEvent(payload));
            }, this);
          }, "_emitMessage"),
          _encode: /* @__PURE__ */ __name(function(buffer) {
            try {
              var string = buffer.toString("binary", 0, buffer.length);
              if (!this.UTF8_MATCH.test(string)) return null;
            } catch (e) {
            }
            return buffer.toString("utf8", 0, buffer.length);
          }, "_encode"),
          _readUInt: /* @__PURE__ */ __name(function(buffer) {
            if (buffer.length === 2) return buffer.readUInt16BE(0);
            return buffer.readUInt32BE(0) * 4294967296 + buffer.readUInt32BE(4);
          }, "_readUInt")
        };
        for (var key in instance)
          Hybi.prototype[key] = instance[key];
        module2.exports = Hybi;
      },
      /* 13 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var RingBuffer = /* @__PURE__ */ __name(function(bufferSize) {
          this._bufferSize = bufferSize;
          this.clear();
        }, "RingBuffer");
        RingBuffer.prototype.clear = function() {
          this._buffer = new Array(this._bufferSize);
          this._ringOffset = 0;
          this._ringSize = this._bufferSize;
          this._head = 0;
          this._tail = 0;
          this.length = 0;
        };
        RingBuffer.prototype.push = function(value) {
          var expandBuffer = false, expandRing = false;
          if (this._ringSize < this._bufferSize) {
            expandBuffer = this._tail === 0;
          } else if (this._ringOffset === this._ringSize) {
            expandBuffer = true;
            expandRing = this._tail === 0;
          }
          if (expandBuffer) {
            this._tail = this._bufferSize;
            this._buffer = this._buffer.concat(new Array(this._bufferSize));
            this._bufferSize = this._buffer.length;
            if (expandRing)
              this._ringSize = this._bufferSize;
          }
          this._buffer[this._tail] = value;
          this.length += 1;
          if (this._tail < this._ringSize) this._ringOffset += 1;
          this._tail = (this._tail + 1) % this._bufferSize;
        };
        RingBuffer.prototype.peek = function() {
          if (this.length === 0) return void 0;
          return this._buffer[this._head];
        };
        RingBuffer.prototype.shift = function() {
          if (this.length === 0) return void 0;
          var value = this._buffer[this._head];
          this._buffer[this._head] = void 0;
          this.length -= 1;
          this._ringOffset -= 1;
          if (this._ringOffset === 0 && this.length > 0) {
            this._head = this._ringSize;
            this._ringOffset = this.length;
            this._ringSize = this._bufferSize;
          } else {
            this._head = (this._head + 1) % this._ringSize;
          }
          return value;
        };
        module2.exports = RingBuffer;
      },
      /* 14 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var RingBuffer = __webpack_require__(13);
        var Pledge = /* @__PURE__ */ __name(function() {
          this._complete = false;
          this._callbacks = new RingBuffer(Pledge.QUEUE_SIZE);
        }, "Pledge");
        Pledge.QUEUE_SIZE = 4;
        Pledge.all = function(list) {
          var pledge = new Pledge(), pending = list.length, n = pending;
          if (pending === 0) pledge.done();
          while (n--) list[n].then(function() {
            pending -= 1;
            if (pending === 0) pledge.done();
          });
          return pledge;
        };
        Pledge.prototype.then = function(callback) {
          if (this._complete) callback();
          else this._callbacks.push(callback);
        };
        Pledge.prototype.done = function() {
          this._complete = true;
          var callbacks = this._callbacks, callback;
          while (callback = callbacks.shift()) callback();
        };
        module2.exports = Pledge;
      },
      /* 15 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Buffer2 = __webpack_require__(1).Buffer, Base = __webpack_require__(2), util = __webpack_require__(0);
        var Draft75 = /* @__PURE__ */ __name(function(request, url, options) {
          Base.apply(this, arguments);
          this._stage = 0;
          this.version = "hixie-75";
          this._headers.set("Upgrade", "WebSocket");
          this._headers.set("Connection", "Upgrade");
          this._headers.set("WebSocket-Origin", this._request.headers.origin);
          this._headers.set("WebSocket-Location", this.url);
        }, "Draft75");
        util.inherits(Draft75, Base);
        var instance = {
          close: /* @__PURE__ */ __name(function() {
            if (this.readyState === 3) return false;
            this.readyState = 3;
            this.emit("close", new Base.CloseEvent(null, null));
            return true;
          }, "close"),
          parse: /* @__PURE__ */ __name(function(chunk) {
            if (this.readyState > 1) return;
            this._reader.put(chunk);
            this._reader.eachByte(function(octet) {
              var message;
              switch (this._stage) {
                case -1:
                  this._body.push(octet);
                  this._sendHandshakeBody();
                  break;
                case 0:
                  this._parseLeadingByte(octet);
                  break;
                case 1:
                  this._length = (octet & 127) + 128 * this._length;
                  if (this._closing && this._length === 0) {
                    return this.close();
                  } else if ((octet & 128) !== 128) {
                    if (this._length === 0) {
                      this._stage = 0;
                    } else {
                      this._skipped = 0;
                      this._stage = 2;
                    }
                  }
                  break;
                case 2:
                  if (octet === 255) {
                    this._stage = 0;
                    message = Buffer2.from(this._buffer).toString("utf8", 0, this._buffer.length);
                    this.emit("message", new Base.MessageEvent(message));
                  } else {
                    if (this._length) {
                      this._skipped += 1;
                      if (this._skipped === this._length)
                        this._stage = 0;
                    } else {
                      this._buffer.push(octet);
                      if (this._buffer.length > this._maxLength) return this.close();
                    }
                  }
                  break;
              }
            }, this);
          }, "parse"),
          frame: /* @__PURE__ */ __name(function(buffer) {
            if (this.readyState === 0) return this._queue([buffer]);
            if (this.readyState > 1) return false;
            if (typeof buffer !== "string") buffer = buffer.toString();
            var length = Buffer2.byteLength(buffer), frame = Buffer2.allocUnsafe(length + 2);
            frame[0] = 0;
            frame.write(buffer, 1);
            frame[frame.length - 1] = 255;
            this._write(frame);
            return true;
          }, "frame"),
          _handshakeResponse: /* @__PURE__ */ __name(function() {
            var start = "HTTP/1.1 101 Web Socket Protocol Handshake", headers = [start, this._headers.toString(), ""];
            return Buffer2.from(headers.join("\r\n"), "utf8");
          }, "_handshakeResponse"),
          _parseLeadingByte: /* @__PURE__ */ __name(function(octet) {
            if ((octet & 128) === 128) {
              this._length = 0;
              this._stage = 1;
            } else {
              delete this._length;
              delete this._skipped;
              this._buffer = [];
              this._stage = 2;
            }
          }, "_parseLeadingByte")
        };
        for (var key in instance)
          Draft75.prototype[key] = instance[key];
        module2.exports = Draft75;
      },
      /* 16 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Event = __webpack_require__(7);
        var EventTarget = {
          onopen: null,
          onmessage: null,
          onerror: null,
          onclose: null,
          addEventListener: /* @__PURE__ */ __name(function(eventType, listener, useCapture) {
            this.on(eventType, listener);
          }, "addEventListener"),
          removeEventListener: /* @__PURE__ */ __name(function(eventType, listener, useCapture) {
            this.removeListener(eventType, listener);
          }, "removeEventListener"),
          dispatchEvent: /* @__PURE__ */ __name(function(event) {
            event.target = event.currentTarget = this;
            event.eventPhase = Event.AT_TARGET;
            if (this["on" + event.type])
              this["on" + event.type](event);
            this.emit(event.type, event);
          }, "dispatchEvent")
        };
        module2.exports = EventTarget;
      },
      /* 17 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        Object.defineProperty(exports2, "__esModule", { value: true });
        var INVALID_UTF16 = "utf8: invalid string";
        var INVALID_UTF8 = "utf8: invalid source encoding";
        function encode(s) {
          var arr = new Uint8Array(encodedLength(s));
          var pos = 0;
          for (var i = 0; i < s.length; i++) {
            var c = s.charCodeAt(i);
            if (c < 128) {
              arr[pos++] = c;
            } else if (c < 2048) {
              arr[pos++] = 192 | c >> 6;
              arr[pos++] = 128 | c & 63;
            } else if (c < 55296) {
              arr[pos++] = 224 | c >> 12;
              arr[pos++] = 128 | c >> 6 & 63;
              arr[pos++] = 128 | c & 63;
            } else {
              i++;
              c = (c & 1023) << 10;
              c |= s.charCodeAt(i) & 1023;
              c += 65536;
              arr[pos++] = 240 | c >> 18;
              arr[pos++] = 128 | c >> 12 & 63;
              arr[pos++] = 128 | c >> 6 & 63;
              arr[pos++] = 128 | c & 63;
            }
          }
          return arr;
        }
        __name(encode, "encode");
        exports2.encode = encode;
        function encodedLength(s) {
          var result = 0;
          for (var i = 0; i < s.length; i++) {
            var c = s.charCodeAt(i);
            if (c < 128) {
              result += 1;
            } else if (c < 2048) {
              result += 2;
            } else if (c < 55296) {
              result += 3;
            } else if (c <= 57343) {
              if (i >= s.length - 1) {
                throw new Error(INVALID_UTF16);
              }
              i++;
              result += 4;
            } else {
              throw new Error(INVALID_UTF16);
            }
          }
          return result;
        }
        __name(encodedLength, "encodedLength");
        exports2.encodedLength = encodedLength;
        function decode(arr) {
          var chars = [];
          for (var i = 0; i < arr.length; i++) {
            var b = arr[i];
            if (b & 128) {
              var min = void 0;
              if (b < 224) {
                if (i >= arr.length) {
                  throw new Error(INVALID_UTF8);
                }
                var n1 = arr[++i];
                if ((n1 & 192) !== 128) {
                  throw new Error(INVALID_UTF8);
                }
                b = (b & 31) << 6 | n1 & 63;
                min = 128;
              } else if (b < 240) {
                if (i >= arr.length - 1) {
                  throw new Error(INVALID_UTF8);
                }
                var n1 = arr[++i];
                var n2 = arr[++i];
                if ((n1 & 192) !== 128 || (n2 & 192) !== 128) {
                  throw new Error(INVALID_UTF8);
                }
                b = (b & 15) << 12 | (n1 & 63) << 6 | n2 & 63;
                min = 2048;
              } else if (b < 248) {
                if (i >= arr.length - 2) {
                  throw new Error(INVALID_UTF8);
                }
                var n1 = arr[++i];
                var n2 = arr[++i];
                var n3 = arr[++i];
                if ((n1 & 192) !== 128 || (n2 & 192) !== 128 || (n3 & 192) !== 128) {
                  throw new Error(INVALID_UTF8);
                }
                b = (b & 15) << 18 | (n1 & 63) << 12 | (n2 & 63) << 6 | n3 & 63;
                min = 65536;
              } else {
                throw new Error(INVALID_UTF8);
              }
              if (b < min || b >= 55296 && b <= 57343) {
                throw new Error(INVALID_UTF8);
              }
              if (b >= 65536) {
                if (b > 1114111) {
                  throw new Error(INVALID_UTF8);
                }
                b -= 65536;
                chars.push(String.fromCharCode(55296 | b >> 10));
                b = 56320 | b & 1023;
              }
            }
            chars.push(String.fromCharCode(b));
          }
          return chars.join("");
        }
        __name(decode, "decode");
        exports2.decode = decode;
      },
      /* 18 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var util = __webpack_require__(0), driver = __webpack_require__(4), API = __webpack_require__(11);
        var WebSocket = /* @__PURE__ */ __name(function(request, socket, body, protocols, options) {
          options = options || {};
          this._stream = socket;
          this._driver = driver.http(request, { maxLength: options.maxLength, protocols });
          var self2 = this;
          if (!this._stream || !this._stream.writable) return;
          if (!this._stream.readable) return this._stream.end();
          var catchup = /* @__PURE__ */ __name(function() {
            self2._stream.removeListener("data", catchup);
          }, "catchup");
          this._stream.on("data", catchup);
          API.call(this, options);
          process.nextTick(function() {
            self2._driver.start();
            self2._driver.io.write(body);
          });
        }, "WebSocket");
        util.inherits(WebSocket, API);
        WebSocket.isWebSocket = function(request) {
          return driver.isWebSocket(request);
        };
        WebSocket.validateOptions = function(options, validKeys) {
          driver.validateOptions(options, validKeys);
        };
        WebSocket.WebSocket = WebSocket;
        WebSocket.Client = __webpack_require__(39);
        WebSocket.EventSource = __webpack_require__(42);
        module2.exports = WebSocket;
      },
      /* 19 */
      /***/
      function(module2, exports2, __webpack_require__) {
        var Url = __webpack_require__(6);
        var spawn = __webpack_require__(43).spawn;
        var fs = __webpack_require__(44);
        exports2.XMLHttpRequest = function() {
          "use strict";
          var self2 = this;
          var http = __webpack_require__(45);
          var https = __webpack_require__(46);
          var request;
          var response;
          var settings = {};
          var disableHeaderCheck = false;
          var defaultHeaders = {
            "User-Agent": "node-XMLHttpRequest",
            "Accept": "*/*"
          };
          var headers = {};
          var headersCase = {};
          var forbiddenRequestHeaders = [
            "accept-charset",
            "accept-encoding",
            "access-control-request-headers",
            "access-control-request-method",
            "connection",
            "content-length",
            "content-transfer-encoding",
            "cookie",
            "cookie2",
            "date",
            "expect",
            "host",
            "keep-alive",
            "origin",
            "referer",
            "te",
            "trailer",
            "transfer-encoding",
            "upgrade",
            "via"
          ];
          var forbiddenRequestMethods = [
            "TRACE",
            "TRACK",
            "CONNECT"
          ];
          var sendFlag = false;
          var errorFlag = false;
          var listeners = {};
          this.UNSENT = 0;
          this.OPENED = 1;
          this.HEADERS_RECEIVED = 2;
          this.LOADING = 3;
          this.DONE = 4;
          this.readyState = this.UNSENT;
          this.onreadystatechange = null;
          this.responseText = "";
          this.responseXML = "";
          this.status = null;
          this.statusText = null;
          this.withCredentials = false;
          var isAllowedHttpHeader = /* @__PURE__ */ __name(function(header) {
            return disableHeaderCheck || header && forbiddenRequestHeaders.indexOf(header.toLowerCase()) === -1;
          }, "isAllowedHttpHeader");
          var isAllowedHttpMethod = /* @__PURE__ */ __name(function(method) {
            return method && forbiddenRequestMethods.indexOf(method) === -1;
          }, "isAllowedHttpMethod");
          this.open = function(method, url, async, user, password) {
            this.abort();
            errorFlag = false;
            if (!isAllowedHttpMethod(method)) {
              throw new Error("SecurityError: Request method not allowed");
            }
            settings = {
              "method": method,
              "url": url.toString(),
              "async": typeof async !== "boolean" ? true : async,
              "user": user || null,
              "password": password || null
            };
            setState(this.OPENED);
          };
          this.setDisableHeaderCheck = function(state) {
            disableHeaderCheck = state;
          };
          this.setRequestHeader = function(header, value) {
            if (this.readyState !== this.OPENED) {
              throw new Error("INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN");
            }
            if (!isAllowedHttpHeader(header)) {
              console.warn('Refused to set unsafe header "' + header + '"');
              return;
            }
            if (sendFlag) {
              throw new Error("INVALID_STATE_ERR: send flag is true");
            }
            header = headersCase[header.toLowerCase()] || header;
            headersCase[header.toLowerCase()] = header;
            headers[header] = headers[header] ? headers[header] + ", " + value : value;
          };
          this.getResponseHeader = function(header) {
            if (typeof header === "string" && this.readyState > this.OPENED && response && response.headers && response.headers[header.toLowerCase()] && !errorFlag) {
              return response.headers[header.toLowerCase()];
            }
            return null;
          };
          this.getAllResponseHeaders = function() {
            if (this.readyState < this.HEADERS_RECEIVED || errorFlag) {
              return "";
            }
            var result = "";
            for (var i in response.headers) {
              if (i !== "set-cookie" && i !== "set-cookie2") {
                result += i + ": " + response.headers[i] + "\r\n";
              }
            }
            return result.substr(0, result.length - 2);
          };
          this.getRequestHeader = function(name) {
            if (typeof name === "string" && headersCase[name.toLowerCase()]) {
              return headers[headersCase[name.toLowerCase()]];
            }
            return "";
          };
          this.send = function(data) {
            if (this.readyState !== this.OPENED) {
              throw new Error("INVALID_STATE_ERR: connection must be opened before send() is called");
            }
            if (sendFlag) {
              throw new Error("INVALID_STATE_ERR: send has already been called");
            }
            var ssl = false, local = false;
            var url = Url.parse(settings.url);
            var host;
            switch (url.protocol) {
              case "https:":
                ssl = true;
              // SSL & non-SSL both need host, no break here.
              case "http:":
                host = url.hostname;
                break;
              case "file:":
                local = true;
                break;
              case void 0:
              case null:
              case "":
                host = "localhost";
                break;
              default:
                throw new Error("Protocol not supported.");
            }
            if (local) {
              if (settings.method !== "GET") {
                throw new Error("XMLHttpRequest: Only GET method is supported");
              }
              if (settings.async) {
                fs.readFile(url.pathname, "utf8", function(error, data2) {
                  if (error) {
                    self2.handleError(error);
                  } else {
                    self2.status = 200;
                    self2.responseText = data2;
                    setState(self2.DONE);
                  }
                });
              } else {
                try {
                  this.responseText = fs.readFileSync(url.pathname, "utf8");
                  this.status = 200;
                  setState(self2.DONE);
                } catch (e) {
                  this.handleError(e);
                }
              }
              return;
            }
            var port = url.port || (ssl ? 443 : 80);
            var uri = url.pathname + (url.search ? url.search : "");
            for (var name in defaultHeaders) {
              if (!headersCase[name.toLowerCase()]) {
                headers[name] = defaultHeaders[name];
              }
            }
            headers.Host = host;
            if (!(ssl && port === 443 || port === 80)) {
              headers.Host += ":" + url.port;
            }
            if (settings.user) {
              if (typeof settings.password === "undefined") {
                settings.password = "";
              }
              var authBuf = new Buffer(settings.user + ":" + settings.password);
              headers.Authorization = "Basic " + authBuf.toString("base64");
            }
            if (settings.method === "GET" || settings.method === "HEAD") {
              data = null;
            } else if (data) {
              headers["Content-Length"] = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
              if (!headers["Content-Type"]) {
                headers["Content-Type"] = "text/plain;charset=UTF-8";
              }
            } else if (settings.method === "POST") {
              headers["Content-Length"] = 0;
            }
            var options = {
              host,
              port,
              path: uri,
              method: settings.method,
              headers,
              agent: false,
              withCredentials: self2.withCredentials
            };
            errorFlag = false;
            if (settings.async) {
              var doRequest = ssl ? https.request : http.request;
              sendFlag = true;
              self2.dispatchEvent("readystatechange");
              var responseHandler = /* @__PURE__ */ __name(function responseHandler2(resp2) {
                response = resp2;
                if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307) {
                  settings.url = response.headers.location;
                  var url2 = Url.parse(settings.url);
                  host = url2.hostname;
                  var newOptions = {
                    hostname: url2.hostname,
                    port: url2.port,
                    path: url2.path,
                    method: response.statusCode === 303 ? "GET" : settings.method,
                    headers,
                    withCredentials: self2.withCredentials
                  };
                  request = doRequest(newOptions, responseHandler2).on("error", errorHandler);
                  request.end();
                  return;
                }
                response.setEncoding("utf8");
                setState(self2.HEADERS_RECEIVED);
                self2.status = response.statusCode;
                response.on("data", function(chunk) {
                  if (chunk) {
                    self2.responseText += chunk;
                  }
                  if (sendFlag) {
                    setState(self2.LOADING);
                  }
                });
                response.on("end", function() {
                  if (sendFlag) {
                    setState(self2.DONE);
                    sendFlag = false;
                  }
                });
                response.on("error", function(error) {
                  self2.handleError(error);
                });
              }, "responseHandler");
              var errorHandler = /* @__PURE__ */ __name(function errorHandler2(error) {
                self2.handleError(error);
              }, "errorHandler");
              request = doRequest(options, responseHandler).on("error", errorHandler);
              if (data) {
                request.write(data);
              }
              request.end();
              self2.dispatchEvent("loadstart");
            } else {
              var contentFile = ".node-xmlhttprequest-content-" + process.pid;
              var syncFile = ".node-xmlhttprequest-sync-" + process.pid;
              fs.writeFileSync(syncFile, "", "utf8");
              var execString = "var http = require('http'), https = require('https'), fs = require('fs');var doRequest = http" + (ssl ? "s" : "") + ".request;var options = " + JSON.stringify(options) + ";var responseText = '';var req = doRequest(options, function(response) {response.setEncoding('utf8');response.on('data', function(chunk) {  responseText += chunk;});response.on('end', function() {fs.writeFileSync('" + contentFile + "', JSON.stringify({err: null, data: {statusCode: response.statusCode, headers: response.headers, text: responseText}}), 'utf8');fs.unlinkSync('" + syncFile + "');});response.on('error', function(error) {fs.writeFileSync('" + contentFile + "', JSON.stringify({err: error}), 'utf8');fs.unlinkSync('" + syncFile + "');});}).on('error', function(error) {fs.writeFileSync('" + contentFile + "', JSON.stringify({err: error}), 'utf8');fs.unlinkSync('" + syncFile + "');});" + (data ? "req.write('" + JSON.stringify(data).slice(1, -1).replace(/'/g, "\\'") + "');" : "") + "req.end();";
              var syncProc = spawn(process.argv[0], ["-e", execString]);
              while (fs.existsSync(syncFile)) {
              }
              var resp = JSON.parse(fs.readFileSync(contentFile, "utf8"));
              syncProc.stdin.end();
              fs.unlinkSync(contentFile);
              if (resp.err) {
                self2.handleError(resp.err);
              } else {
                response = resp.data;
                self2.status = resp.data.statusCode;
                self2.responseText = resp.data.text;
                setState(self2.DONE);
              }
            }
          };
          this.handleError = function(error) {
            this.status = 0;
            this.statusText = error;
            this.responseText = error.stack;
            errorFlag = true;
            setState(this.DONE);
            this.dispatchEvent("error");
          };
          this.abort = function() {
            if (request) {
              request.abort();
              request = null;
            }
            headers = defaultHeaders;
            this.status = 0;
            this.responseText = "";
            this.responseXML = "";
            errorFlag = true;
            if (this.readyState !== this.UNSENT && (this.readyState !== this.OPENED || sendFlag) && this.readyState !== this.DONE) {
              sendFlag = false;
              setState(this.DONE);
            }
            this.readyState = this.UNSENT;
            this.dispatchEvent("abort");
          };
          this.addEventListener = function(event, callback) {
            if (!(event in listeners)) {
              listeners[event] = [];
            }
            listeners[event].push(callback);
          };
          this.removeEventListener = function(event, callback) {
            if (event in listeners) {
              listeners[event] = listeners[event].filter(function(ev) {
                return ev !== callback;
              });
            }
          };
          this.dispatchEvent = function(event) {
            if (typeof self2["on" + event] === "function") {
              self2["on" + event]();
            }
            if (event in listeners) {
              for (var i = 0, len = listeners[event].length; i < len; i++) {
                listeners[event][i].call(self2);
              }
            }
          };
          var setState = /* @__PURE__ */ __name(function(state) {
            if (state == self2.LOADING || self2.readyState !== state) {
              self2.readyState = state;
              if (settings.async || self2.readyState < self2.OPENED || self2.readyState === self2.DONE) {
                self2.dispatchEvent("readystatechange");
              }
              if (self2.readyState === self2.DONE && !errorFlag) {
                self2.dispatchEvent("load");
                self2.dispatchEvent("loadend");
              }
            }
          }, "setState");
        };
      },
      /* 20 */
      /***/
      function(module2, exports2, __webpack_require__) {
        (function(nacl) {
          "use strict";
          var gf = /* @__PURE__ */ __name(function(init) {
            var i, r = new Float64Array(16);
            if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
            return r;
          }, "gf");
          var randombytes = /* @__PURE__ */ __name(function() {
            throw new Error("no PRNG");
          }, "randombytes");
          var _0 = new Uint8Array(16);
          var _9 = new Uint8Array(32);
          _9[0] = 9;
          var gf0 = gf(), gf1 = gf([1]), _121665 = gf([56129, 1]), D = gf([30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886, 20995]), D2 = gf([61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222]), X = gf([54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035, 8553]), Y = gf([26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214]), I = gf([41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139]);
          function ts64(x, i, h, l) {
            x[i] = h >> 24 & 255;
            x[i + 1] = h >> 16 & 255;
            x[i + 2] = h >> 8 & 255;
            x[i + 3] = h & 255;
            x[i + 4] = l >> 24 & 255;
            x[i + 5] = l >> 16 & 255;
            x[i + 6] = l >> 8 & 255;
            x[i + 7] = l & 255;
          }
          __name(ts64, "ts64");
          function vn(x, xi, y, yi, n) {
            var i, d = 0;
            for (i = 0; i < n; i++) d |= x[xi + i] ^ y[yi + i];
            return (1 & d - 1 >>> 8) - 1;
          }
          __name(vn, "vn");
          function crypto_verify_16(x, xi, y, yi) {
            return vn(x, xi, y, yi, 16);
          }
          __name(crypto_verify_16, "crypto_verify_16");
          function crypto_verify_32(x, xi, y, yi) {
            return vn(x, xi, y, yi, 32);
          }
          __name(crypto_verify_32, "crypto_verify_32");
          function core_salsa20(o, p, k, c) {
            var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
            var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
            for (var i = 0; i < 20; i += 2) {
              u = x0 + x12 | 0;
              x4 ^= u << 7 | u >>> 32 - 7;
              u = x4 + x0 | 0;
              x8 ^= u << 9 | u >>> 32 - 9;
              u = x8 + x4 | 0;
              x12 ^= u << 13 | u >>> 32 - 13;
              u = x12 + x8 | 0;
              x0 ^= u << 18 | u >>> 32 - 18;
              u = x5 + x1 | 0;
              x9 ^= u << 7 | u >>> 32 - 7;
              u = x9 + x5 | 0;
              x13 ^= u << 9 | u >>> 32 - 9;
              u = x13 + x9 | 0;
              x1 ^= u << 13 | u >>> 32 - 13;
              u = x1 + x13 | 0;
              x5 ^= u << 18 | u >>> 32 - 18;
              u = x10 + x6 | 0;
              x14 ^= u << 7 | u >>> 32 - 7;
              u = x14 + x10 | 0;
              x2 ^= u << 9 | u >>> 32 - 9;
              u = x2 + x14 | 0;
              x6 ^= u << 13 | u >>> 32 - 13;
              u = x6 + x2 | 0;
              x10 ^= u << 18 | u >>> 32 - 18;
              u = x15 + x11 | 0;
              x3 ^= u << 7 | u >>> 32 - 7;
              u = x3 + x15 | 0;
              x7 ^= u << 9 | u >>> 32 - 9;
              u = x7 + x3 | 0;
              x11 ^= u << 13 | u >>> 32 - 13;
              u = x11 + x7 | 0;
              x15 ^= u << 18 | u >>> 32 - 18;
              u = x0 + x3 | 0;
              x1 ^= u << 7 | u >>> 32 - 7;
              u = x1 + x0 | 0;
              x2 ^= u << 9 | u >>> 32 - 9;
              u = x2 + x1 | 0;
              x3 ^= u << 13 | u >>> 32 - 13;
              u = x3 + x2 | 0;
              x0 ^= u << 18 | u >>> 32 - 18;
              u = x5 + x4 | 0;
              x6 ^= u << 7 | u >>> 32 - 7;
              u = x6 + x5 | 0;
              x7 ^= u << 9 | u >>> 32 - 9;
              u = x7 + x6 | 0;
              x4 ^= u << 13 | u >>> 32 - 13;
              u = x4 + x7 | 0;
              x5 ^= u << 18 | u >>> 32 - 18;
              u = x10 + x9 | 0;
              x11 ^= u << 7 | u >>> 32 - 7;
              u = x11 + x10 | 0;
              x8 ^= u << 9 | u >>> 32 - 9;
              u = x8 + x11 | 0;
              x9 ^= u << 13 | u >>> 32 - 13;
              u = x9 + x8 | 0;
              x10 ^= u << 18 | u >>> 32 - 18;
              u = x15 + x14 | 0;
              x12 ^= u << 7 | u >>> 32 - 7;
              u = x12 + x15 | 0;
              x13 ^= u << 9 | u >>> 32 - 9;
              u = x13 + x12 | 0;
              x14 ^= u << 13 | u >>> 32 - 13;
              u = x14 + x13 | 0;
              x15 ^= u << 18 | u >>> 32 - 18;
            }
            x0 = x0 + j0 | 0;
            x1 = x1 + j1 | 0;
            x2 = x2 + j2 | 0;
            x3 = x3 + j3 | 0;
            x4 = x4 + j4 | 0;
            x5 = x5 + j5 | 0;
            x6 = x6 + j6 | 0;
            x7 = x7 + j7 | 0;
            x8 = x8 + j8 | 0;
            x9 = x9 + j9 | 0;
            x10 = x10 + j10 | 0;
            x11 = x11 + j11 | 0;
            x12 = x12 + j12 | 0;
            x13 = x13 + j13 | 0;
            x14 = x14 + j14 | 0;
            x15 = x15 + j15 | 0;
            o[0] = x0 >>> 0 & 255;
            o[1] = x0 >>> 8 & 255;
            o[2] = x0 >>> 16 & 255;
            o[3] = x0 >>> 24 & 255;
            o[4] = x1 >>> 0 & 255;
            o[5] = x1 >>> 8 & 255;
            o[6] = x1 >>> 16 & 255;
            o[7] = x1 >>> 24 & 255;
            o[8] = x2 >>> 0 & 255;
            o[9] = x2 >>> 8 & 255;
            o[10] = x2 >>> 16 & 255;
            o[11] = x2 >>> 24 & 255;
            o[12] = x3 >>> 0 & 255;
            o[13] = x3 >>> 8 & 255;
            o[14] = x3 >>> 16 & 255;
            o[15] = x3 >>> 24 & 255;
            o[16] = x4 >>> 0 & 255;
            o[17] = x4 >>> 8 & 255;
            o[18] = x4 >>> 16 & 255;
            o[19] = x4 >>> 24 & 255;
            o[20] = x5 >>> 0 & 255;
            o[21] = x5 >>> 8 & 255;
            o[22] = x5 >>> 16 & 255;
            o[23] = x5 >>> 24 & 255;
            o[24] = x6 >>> 0 & 255;
            o[25] = x6 >>> 8 & 255;
            o[26] = x6 >>> 16 & 255;
            o[27] = x6 >>> 24 & 255;
            o[28] = x7 >>> 0 & 255;
            o[29] = x7 >>> 8 & 255;
            o[30] = x7 >>> 16 & 255;
            o[31] = x7 >>> 24 & 255;
            o[32] = x8 >>> 0 & 255;
            o[33] = x8 >>> 8 & 255;
            o[34] = x8 >>> 16 & 255;
            o[35] = x8 >>> 24 & 255;
            o[36] = x9 >>> 0 & 255;
            o[37] = x9 >>> 8 & 255;
            o[38] = x9 >>> 16 & 255;
            o[39] = x9 >>> 24 & 255;
            o[40] = x10 >>> 0 & 255;
            o[41] = x10 >>> 8 & 255;
            o[42] = x10 >>> 16 & 255;
            o[43] = x10 >>> 24 & 255;
            o[44] = x11 >>> 0 & 255;
            o[45] = x11 >>> 8 & 255;
            o[46] = x11 >>> 16 & 255;
            o[47] = x11 >>> 24 & 255;
            o[48] = x12 >>> 0 & 255;
            o[49] = x12 >>> 8 & 255;
            o[50] = x12 >>> 16 & 255;
            o[51] = x12 >>> 24 & 255;
            o[52] = x13 >>> 0 & 255;
            o[53] = x13 >>> 8 & 255;
            o[54] = x13 >>> 16 & 255;
            o[55] = x13 >>> 24 & 255;
            o[56] = x14 >>> 0 & 255;
            o[57] = x14 >>> 8 & 255;
            o[58] = x14 >>> 16 & 255;
            o[59] = x14 >>> 24 & 255;
            o[60] = x15 >>> 0 & 255;
            o[61] = x15 >>> 8 & 255;
            o[62] = x15 >>> 16 & 255;
            o[63] = x15 >>> 24 & 255;
          }
          __name(core_salsa20, "core_salsa20");
          function core_hsalsa20(o, p, k, c) {
            var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
            var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
            for (var i = 0; i < 20; i += 2) {
              u = x0 + x12 | 0;
              x4 ^= u << 7 | u >>> 32 - 7;
              u = x4 + x0 | 0;
              x8 ^= u << 9 | u >>> 32 - 9;
              u = x8 + x4 | 0;
              x12 ^= u << 13 | u >>> 32 - 13;
              u = x12 + x8 | 0;
              x0 ^= u << 18 | u >>> 32 - 18;
              u = x5 + x1 | 0;
              x9 ^= u << 7 | u >>> 32 - 7;
              u = x9 + x5 | 0;
              x13 ^= u << 9 | u >>> 32 - 9;
              u = x13 + x9 | 0;
              x1 ^= u << 13 | u >>> 32 - 13;
              u = x1 + x13 | 0;
              x5 ^= u << 18 | u >>> 32 - 18;
              u = x10 + x6 | 0;
              x14 ^= u << 7 | u >>> 32 - 7;
              u = x14 + x10 | 0;
              x2 ^= u << 9 | u >>> 32 - 9;
              u = x2 + x14 | 0;
              x6 ^= u << 13 | u >>> 32 - 13;
              u = x6 + x2 | 0;
              x10 ^= u << 18 | u >>> 32 - 18;
              u = x15 + x11 | 0;
              x3 ^= u << 7 | u >>> 32 - 7;
              u = x3 + x15 | 0;
              x7 ^= u << 9 | u >>> 32 - 9;
              u = x7 + x3 | 0;
              x11 ^= u << 13 | u >>> 32 - 13;
              u = x11 + x7 | 0;
              x15 ^= u << 18 | u >>> 32 - 18;
              u = x0 + x3 | 0;
              x1 ^= u << 7 | u >>> 32 - 7;
              u = x1 + x0 | 0;
              x2 ^= u << 9 | u >>> 32 - 9;
              u = x2 + x1 | 0;
              x3 ^= u << 13 | u >>> 32 - 13;
              u = x3 + x2 | 0;
              x0 ^= u << 18 | u >>> 32 - 18;
              u = x5 + x4 | 0;
              x6 ^= u << 7 | u >>> 32 - 7;
              u = x6 + x5 | 0;
              x7 ^= u << 9 | u >>> 32 - 9;
              u = x7 + x6 | 0;
              x4 ^= u << 13 | u >>> 32 - 13;
              u = x4 + x7 | 0;
              x5 ^= u << 18 | u >>> 32 - 18;
              u = x10 + x9 | 0;
              x11 ^= u << 7 | u >>> 32 - 7;
              u = x11 + x10 | 0;
              x8 ^= u << 9 | u >>> 32 - 9;
              u = x8 + x11 | 0;
              x9 ^= u << 13 | u >>> 32 - 13;
              u = x9 + x8 | 0;
              x10 ^= u << 18 | u >>> 32 - 18;
              u = x15 + x14 | 0;
              x12 ^= u << 7 | u >>> 32 - 7;
              u = x12 + x15 | 0;
              x13 ^= u << 9 | u >>> 32 - 9;
              u = x13 + x12 | 0;
              x14 ^= u << 13 | u >>> 32 - 13;
              u = x14 + x13 | 0;
              x15 ^= u << 18 | u >>> 32 - 18;
            }
            o[0] = x0 >>> 0 & 255;
            o[1] = x0 >>> 8 & 255;
            o[2] = x0 >>> 16 & 255;
            o[3] = x0 >>> 24 & 255;
            o[4] = x5 >>> 0 & 255;
            o[5] = x5 >>> 8 & 255;
            o[6] = x5 >>> 16 & 255;
            o[7] = x5 >>> 24 & 255;
            o[8] = x10 >>> 0 & 255;
            o[9] = x10 >>> 8 & 255;
            o[10] = x10 >>> 16 & 255;
            o[11] = x10 >>> 24 & 255;
            o[12] = x15 >>> 0 & 255;
            o[13] = x15 >>> 8 & 255;
            o[14] = x15 >>> 16 & 255;
            o[15] = x15 >>> 24 & 255;
            o[16] = x6 >>> 0 & 255;
            o[17] = x6 >>> 8 & 255;
            o[18] = x6 >>> 16 & 255;
            o[19] = x6 >>> 24 & 255;
            o[20] = x7 >>> 0 & 255;
            o[21] = x7 >>> 8 & 255;
            o[22] = x7 >>> 16 & 255;
            o[23] = x7 >>> 24 & 255;
            o[24] = x8 >>> 0 & 255;
            o[25] = x8 >>> 8 & 255;
            o[26] = x8 >>> 16 & 255;
            o[27] = x8 >>> 24 & 255;
            o[28] = x9 >>> 0 & 255;
            o[29] = x9 >>> 8 & 255;
            o[30] = x9 >>> 16 & 255;
            o[31] = x9 >>> 24 & 255;
          }
          __name(core_hsalsa20, "core_hsalsa20");
          function crypto_core_salsa20(out, inp, k, c) {
            core_salsa20(out, inp, k, c);
          }
          __name(crypto_core_salsa20, "crypto_core_salsa20");
          function crypto_core_hsalsa20(out, inp, k, c) {
            core_hsalsa20(out, inp, k, c);
          }
          __name(crypto_core_hsalsa20, "crypto_core_hsalsa20");
          var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
          function crypto_stream_salsa20_xor(c, cpos, m, mpos, b, n, k) {
            var z = new Uint8Array(16), x = new Uint8Array(64);
            var u, i;
            for (i = 0; i < 16; i++) z[i] = 0;
            for (i = 0; i < 8; i++) z[i] = n[i];
            while (b >= 64) {
              crypto_core_salsa20(x, z, k, sigma);
              for (i = 0; i < 64; i++) c[cpos + i] = m[mpos + i] ^ x[i];
              u = 1;
              for (i = 8; i < 16; i++) {
                u = u + (z[i] & 255) | 0;
                z[i] = u & 255;
                u >>>= 8;
              }
              b -= 64;
              cpos += 64;
              mpos += 64;
            }
            if (b > 0) {
              crypto_core_salsa20(x, z, k, sigma);
              for (i = 0; i < b; i++) c[cpos + i] = m[mpos + i] ^ x[i];
            }
            return 0;
          }
          __name(crypto_stream_salsa20_xor, "crypto_stream_salsa20_xor");
          function crypto_stream_salsa20(c, cpos, b, n, k) {
            var z = new Uint8Array(16), x = new Uint8Array(64);
            var u, i;
            for (i = 0; i < 16; i++) z[i] = 0;
            for (i = 0; i < 8; i++) z[i] = n[i];
            while (b >= 64) {
              crypto_core_salsa20(x, z, k, sigma);
              for (i = 0; i < 64; i++) c[cpos + i] = x[i];
              u = 1;
              for (i = 8; i < 16; i++) {
                u = u + (z[i] & 255) | 0;
                z[i] = u & 255;
                u >>>= 8;
              }
              b -= 64;
              cpos += 64;
            }
            if (b > 0) {
              crypto_core_salsa20(x, z, k, sigma);
              for (i = 0; i < b; i++) c[cpos + i] = x[i];
            }
            return 0;
          }
          __name(crypto_stream_salsa20, "crypto_stream_salsa20");
          function crypto_stream(c, cpos, d, n, k) {
            var s = new Uint8Array(32);
            crypto_core_hsalsa20(s, n, k, sigma);
            var sn = new Uint8Array(8);
            for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
            return crypto_stream_salsa20(c, cpos, d, sn, s);
          }
          __name(crypto_stream, "crypto_stream");
          function crypto_stream_xor(c, cpos, m, mpos, d, n, k) {
            var s = new Uint8Array(32);
            crypto_core_hsalsa20(s, n, k, sigma);
            var sn = new Uint8Array(8);
            for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
            return crypto_stream_salsa20_xor(c, cpos, m, mpos, d, sn, s);
          }
          __name(crypto_stream_xor, "crypto_stream_xor");
          var poly1305 = /* @__PURE__ */ __name(function(key) {
            this.buffer = new Uint8Array(16);
            this.r = new Uint16Array(10);
            this.h = new Uint16Array(10);
            this.pad = new Uint16Array(8);
            this.leftover = 0;
            this.fin = 0;
            var t0, t1, t2, t3, t4, t5, t6, t7;
            t0 = key[0] & 255 | (key[1] & 255) << 8;
            this.r[0] = t0 & 8191;
            t1 = key[2] & 255 | (key[3] & 255) << 8;
            this.r[1] = (t0 >>> 13 | t1 << 3) & 8191;
            t2 = key[4] & 255 | (key[5] & 255) << 8;
            this.r[2] = (t1 >>> 10 | t2 << 6) & 7939;
            t3 = key[6] & 255 | (key[7] & 255) << 8;
            this.r[3] = (t2 >>> 7 | t3 << 9) & 8191;
            t4 = key[8] & 255 | (key[9] & 255) << 8;
            this.r[4] = (t3 >>> 4 | t4 << 12) & 255;
            this.r[5] = t4 >>> 1 & 8190;
            t5 = key[10] & 255 | (key[11] & 255) << 8;
            this.r[6] = (t4 >>> 14 | t5 << 2) & 8191;
            t6 = key[12] & 255 | (key[13] & 255) << 8;
            this.r[7] = (t5 >>> 11 | t6 << 5) & 8065;
            t7 = key[14] & 255 | (key[15] & 255) << 8;
            this.r[8] = (t6 >>> 8 | t7 << 8) & 8191;
            this.r[9] = t7 >>> 5 & 127;
            this.pad[0] = key[16] & 255 | (key[17] & 255) << 8;
            this.pad[1] = key[18] & 255 | (key[19] & 255) << 8;
            this.pad[2] = key[20] & 255 | (key[21] & 255) << 8;
            this.pad[3] = key[22] & 255 | (key[23] & 255) << 8;
            this.pad[4] = key[24] & 255 | (key[25] & 255) << 8;
            this.pad[5] = key[26] & 255 | (key[27] & 255) << 8;
            this.pad[6] = key[28] & 255 | (key[29] & 255) << 8;
            this.pad[7] = key[30] & 255 | (key[31] & 255) << 8;
          }, "poly1305");
          poly1305.prototype.blocks = function(m, mpos, bytes) {
            var hibit = this.fin ? 0 : 1 << 11;
            var t0, t1, t2, t3, t4, t5, t6, t7, c;
            var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;
            var h0 = this.h[0], h1 = this.h[1], h2 = this.h[2], h3 = this.h[3], h4 = this.h[4], h5 = this.h[5], h6 = this.h[6], h7 = this.h[7], h8 = this.h[8], h9 = this.h[9];
            var r0 = this.r[0], r1 = this.r[1], r2 = this.r[2], r3 = this.r[3], r4 = this.r[4], r5 = this.r[5], r6 = this.r[6], r7 = this.r[7], r8 = this.r[8], r9 = this.r[9];
            while (bytes >= 16) {
              t0 = m[mpos + 0] & 255 | (m[mpos + 1] & 255) << 8;
              h0 += t0 & 8191;
              t1 = m[mpos + 2] & 255 | (m[mpos + 3] & 255) << 8;
              h1 += (t0 >>> 13 | t1 << 3) & 8191;
              t2 = m[mpos + 4] & 255 | (m[mpos + 5] & 255) << 8;
              h2 += (t1 >>> 10 | t2 << 6) & 8191;
              t3 = m[mpos + 6] & 255 | (m[mpos + 7] & 255) << 8;
              h3 += (t2 >>> 7 | t3 << 9) & 8191;
              t4 = m[mpos + 8] & 255 | (m[mpos + 9] & 255) << 8;
              h4 += (t3 >>> 4 | t4 << 12) & 8191;
              h5 += t4 >>> 1 & 8191;
              t5 = m[mpos + 10] & 255 | (m[mpos + 11] & 255) << 8;
              h6 += (t4 >>> 14 | t5 << 2) & 8191;
              t6 = m[mpos + 12] & 255 | (m[mpos + 13] & 255) << 8;
              h7 += (t5 >>> 11 | t6 << 5) & 8191;
              t7 = m[mpos + 14] & 255 | (m[mpos + 15] & 255) << 8;
              h8 += (t6 >>> 8 | t7 << 8) & 8191;
              h9 += t7 >>> 5 | hibit;
              c = 0;
              d0 = c;
              d0 += h0 * r0;
              d0 += h1 * (5 * r9);
              d0 += h2 * (5 * r8);
              d0 += h3 * (5 * r7);
              d0 += h4 * (5 * r6);
              c = d0 >>> 13;
              d0 &= 8191;
              d0 += h5 * (5 * r5);
              d0 += h6 * (5 * r4);
              d0 += h7 * (5 * r3);
              d0 += h8 * (5 * r2);
              d0 += h9 * (5 * r1);
              c += d0 >>> 13;
              d0 &= 8191;
              d1 = c;
              d1 += h0 * r1;
              d1 += h1 * r0;
              d1 += h2 * (5 * r9);
              d1 += h3 * (5 * r8);
              d1 += h4 * (5 * r7);
              c = d1 >>> 13;
              d1 &= 8191;
              d1 += h5 * (5 * r6);
              d1 += h6 * (5 * r5);
              d1 += h7 * (5 * r4);
              d1 += h8 * (5 * r3);
              d1 += h9 * (5 * r2);
              c += d1 >>> 13;
              d1 &= 8191;
              d2 = c;
              d2 += h0 * r2;
              d2 += h1 * r1;
              d2 += h2 * r0;
              d2 += h3 * (5 * r9);
              d2 += h4 * (5 * r8);
              c = d2 >>> 13;
              d2 &= 8191;
              d2 += h5 * (5 * r7);
              d2 += h6 * (5 * r6);
              d2 += h7 * (5 * r5);
              d2 += h8 * (5 * r4);
              d2 += h9 * (5 * r3);
              c += d2 >>> 13;
              d2 &= 8191;
              d3 = c;
              d3 += h0 * r3;
              d3 += h1 * r2;
              d3 += h2 * r1;
              d3 += h3 * r0;
              d3 += h4 * (5 * r9);
              c = d3 >>> 13;
              d3 &= 8191;
              d3 += h5 * (5 * r8);
              d3 += h6 * (5 * r7);
              d3 += h7 * (5 * r6);
              d3 += h8 * (5 * r5);
              d3 += h9 * (5 * r4);
              c += d3 >>> 13;
              d3 &= 8191;
              d4 = c;
              d4 += h0 * r4;
              d4 += h1 * r3;
              d4 += h2 * r2;
              d4 += h3 * r1;
              d4 += h4 * r0;
              c = d4 >>> 13;
              d4 &= 8191;
              d4 += h5 * (5 * r9);
              d4 += h6 * (5 * r8);
              d4 += h7 * (5 * r7);
              d4 += h8 * (5 * r6);
              d4 += h9 * (5 * r5);
              c += d4 >>> 13;
              d4 &= 8191;
              d5 = c;
              d5 += h0 * r5;
              d5 += h1 * r4;
              d5 += h2 * r3;
              d5 += h3 * r2;
              d5 += h4 * r1;
              c = d5 >>> 13;
              d5 &= 8191;
              d5 += h5 * r0;
              d5 += h6 * (5 * r9);
              d5 += h7 * (5 * r8);
              d5 += h8 * (5 * r7);
              d5 += h9 * (5 * r6);
              c += d5 >>> 13;
              d5 &= 8191;
              d6 = c;
              d6 += h0 * r6;
              d6 += h1 * r5;
              d6 += h2 * r4;
              d6 += h3 * r3;
              d6 += h4 * r2;
              c = d6 >>> 13;
              d6 &= 8191;
              d6 += h5 * r1;
              d6 += h6 * r0;
              d6 += h7 * (5 * r9);
              d6 += h8 * (5 * r8);
              d6 += h9 * (5 * r7);
              c += d6 >>> 13;
              d6 &= 8191;
              d7 = c;
              d7 += h0 * r7;
              d7 += h1 * r6;
              d7 += h2 * r5;
              d7 += h3 * r4;
              d7 += h4 * r3;
              c = d7 >>> 13;
              d7 &= 8191;
              d7 += h5 * r2;
              d7 += h6 * r1;
              d7 += h7 * r0;
              d7 += h8 * (5 * r9);
              d7 += h9 * (5 * r8);
              c += d7 >>> 13;
              d7 &= 8191;
              d8 = c;
              d8 += h0 * r8;
              d8 += h1 * r7;
              d8 += h2 * r6;
              d8 += h3 * r5;
              d8 += h4 * r4;
              c = d8 >>> 13;
              d8 &= 8191;
              d8 += h5 * r3;
              d8 += h6 * r2;
              d8 += h7 * r1;
              d8 += h8 * r0;
              d8 += h9 * (5 * r9);
              c += d8 >>> 13;
              d8 &= 8191;
              d9 = c;
              d9 += h0 * r9;
              d9 += h1 * r8;
              d9 += h2 * r7;
              d9 += h3 * r6;
              d9 += h4 * r5;
              c = d9 >>> 13;
              d9 &= 8191;
              d9 += h5 * r4;
              d9 += h6 * r3;
              d9 += h7 * r2;
              d9 += h8 * r1;
              d9 += h9 * r0;
              c += d9 >>> 13;
              d9 &= 8191;
              c = (c << 2) + c | 0;
              c = c + d0 | 0;
              d0 = c & 8191;
              c = c >>> 13;
              d1 += c;
              h0 = d0;
              h1 = d1;
              h2 = d2;
              h3 = d3;
              h4 = d4;
              h5 = d5;
              h6 = d6;
              h7 = d7;
              h8 = d8;
              h9 = d9;
              mpos += 16;
              bytes -= 16;
            }
            this.h[0] = h0;
            this.h[1] = h1;
            this.h[2] = h2;
            this.h[3] = h3;
            this.h[4] = h4;
            this.h[5] = h5;
            this.h[6] = h6;
            this.h[7] = h7;
            this.h[8] = h8;
            this.h[9] = h9;
          };
          poly1305.prototype.finish = function(mac, macpos) {
            var g = new Uint16Array(10);
            var c, mask, f, i;
            if (this.leftover) {
              i = this.leftover;
              this.buffer[i++] = 1;
              for (; i < 16; i++) this.buffer[i] = 0;
              this.fin = 1;
              this.blocks(this.buffer, 0, 16);
            }
            c = this.h[1] >>> 13;
            this.h[1] &= 8191;
            for (i = 2; i < 10; i++) {
              this.h[i] += c;
              c = this.h[i] >>> 13;
              this.h[i] &= 8191;
            }
            this.h[0] += c * 5;
            c = this.h[0] >>> 13;
            this.h[0] &= 8191;
            this.h[1] += c;
            c = this.h[1] >>> 13;
            this.h[1] &= 8191;
            this.h[2] += c;
            g[0] = this.h[0] + 5;
            c = g[0] >>> 13;
            g[0] &= 8191;
            for (i = 1; i < 10; i++) {
              g[i] = this.h[i] + c;
              c = g[i] >>> 13;
              g[i] &= 8191;
            }
            g[9] -= 1 << 13;
            mask = (c ^ 1) - 1;
            for (i = 0; i < 10; i++) g[i] &= mask;
            mask = ~mask;
            for (i = 0; i < 10; i++) this.h[i] = this.h[i] & mask | g[i];
            this.h[0] = (this.h[0] | this.h[1] << 13) & 65535;
            this.h[1] = (this.h[1] >>> 3 | this.h[2] << 10) & 65535;
            this.h[2] = (this.h[2] >>> 6 | this.h[3] << 7) & 65535;
            this.h[3] = (this.h[3] >>> 9 | this.h[4] << 4) & 65535;
            this.h[4] = (this.h[4] >>> 12 | this.h[5] << 1 | this.h[6] << 14) & 65535;
            this.h[5] = (this.h[6] >>> 2 | this.h[7] << 11) & 65535;
            this.h[6] = (this.h[7] >>> 5 | this.h[8] << 8) & 65535;
            this.h[7] = (this.h[8] >>> 8 | this.h[9] << 5) & 65535;
            f = this.h[0] + this.pad[0];
            this.h[0] = f & 65535;
            for (i = 1; i < 8; i++) {
              f = (this.h[i] + this.pad[i] | 0) + (f >>> 16) | 0;
              this.h[i] = f & 65535;
            }
            mac[macpos + 0] = this.h[0] >>> 0 & 255;
            mac[macpos + 1] = this.h[0] >>> 8 & 255;
            mac[macpos + 2] = this.h[1] >>> 0 & 255;
            mac[macpos + 3] = this.h[1] >>> 8 & 255;
            mac[macpos + 4] = this.h[2] >>> 0 & 255;
            mac[macpos + 5] = this.h[2] >>> 8 & 255;
            mac[macpos + 6] = this.h[3] >>> 0 & 255;
            mac[macpos + 7] = this.h[3] >>> 8 & 255;
            mac[macpos + 8] = this.h[4] >>> 0 & 255;
            mac[macpos + 9] = this.h[4] >>> 8 & 255;
            mac[macpos + 10] = this.h[5] >>> 0 & 255;
            mac[macpos + 11] = this.h[5] >>> 8 & 255;
            mac[macpos + 12] = this.h[6] >>> 0 & 255;
            mac[macpos + 13] = this.h[6] >>> 8 & 255;
            mac[macpos + 14] = this.h[7] >>> 0 & 255;
            mac[macpos + 15] = this.h[7] >>> 8 & 255;
          };
          poly1305.prototype.update = function(m, mpos, bytes) {
            var i, want;
            if (this.leftover) {
              want = 16 - this.leftover;
              if (want > bytes)
                want = bytes;
              for (i = 0; i < want; i++)
                this.buffer[this.leftover + i] = m[mpos + i];
              bytes -= want;
              mpos += want;
              this.leftover += want;
              if (this.leftover < 16)
                return;
              this.blocks(this.buffer, 0, 16);
              this.leftover = 0;
            }
            if (bytes >= 16) {
              want = bytes - bytes % 16;
              this.blocks(m, mpos, want);
              mpos += want;
              bytes -= want;
            }
            if (bytes) {
              for (i = 0; i < bytes; i++)
                this.buffer[this.leftover + i] = m[mpos + i];
              this.leftover += bytes;
            }
          };
          function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
            var s = new poly1305(k);
            s.update(m, mpos, n);
            s.finish(out, outpos);
            return 0;
          }
          __name(crypto_onetimeauth, "crypto_onetimeauth");
          function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
            var x = new Uint8Array(16);
            crypto_onetimeauth(x, 0, m, mpos, n, k);
            return crypto_verify_16(h, hpos, x, 0);
          }
          __name(crypto_onetimeauth_verify, "crypto_onetimeauth_verify");
          function crypto_secretbox(c, m, d, n, k) {
            var i;
            if (d < 32) return -1;
            crypto_stream_xor(c, 0, m, 0, d, n, k);
            crypto_onetimeauth(c, 16, c, 32, d - 32, c);
            for (i = 0; i < 16; i++) c[i] = 0;
            return 0;
          }
          __name(crypto_secretbox, "crypto_secretbox");
          function crypto_secretbox_open(m, c, d, n, k) {
            var i;
            var x = new Uint8Array(32);
            if (d < 32) return -1;
            crypto_stream(x, 0, 32, n, k);
            if (crypto_onetimeauth_verify(c, 16, c, 32, d - 32, x) !== 0) return -1;
            crypto_stream_xor(m, 0, c, 0, d, n, k);
            for (i = 0; i < 32; i++) m[i] = 0;
            return 0;
          }
          __name(crypto_secretbox_open, "crypto_secretbox_open");
          function set25519(r, a) {
            var i;
            for (i = 0; i < 16; i++) r[i] = a[i] | 0;
          }
          __name(set25519, "set25519");
          function car25519(o) {
            var i, v, c = 1;
            for (i = 0; i < 16; i++) {
              v = o[i] + c + 65535;
              c = Math.floor(v / 65536);
              o[i] = v - c * 65536;
            }
            o[0] += c - 1 + 37 * (c - 1);
          }
          __name(car25519, "car25519");
          function sel25519(p, q, b) {
            var t, c = ~(b - 1);
            for (var i = 0; i < 16; i++) {
              t = c & (p[i] ^ q[i]);
              p[i] ^= t;
              q[i] ^= t;
            }
          }
          __name(sel25519, "sel25519");
          function pack25519(o, n) {
            var i, j, b;
            var m = gf(), t = gf();
            for (i = 0; i < 16; i++) t[i] = n[i];
            car25519(t);
            car25519(t);
            car25519(t);
            for (j = 0; j < 2; j++) {
              m[0] = t[0] - 65517;
              for (i = 1; i < 15; i++) {
                m[i] = t[i] - 65535 - (m[i - 1] >> 16 & 1);
                m[i - 1] &= 65535;
              }
              m[15] = t[15] - 32767 - (m[14] >> 16 & 1);
              b = m[15] >> 16 & 1;
              m[14] &= 65535;
              sel25519(t, m, 1 - b);
            }
            for (i = 0; i < 16; i++) {
              o[2 * i] = t[i] & 255;
              o[2 * i + 1] = t[i] >> 8;
            }
          }
          __name(pack25519, "pack25519");
          function neq25519(a, b) {
            var c = new Uint8Array(32), d = new Uint8Array(32);
            pack25519(c, a);
            pack25519(d, b);
            return crypto_verify_32(c, 0, d, 0);
          }
          __name(neq25519, "neq25519");
          function par25519(a) {
            var d = new Uint8Array(32);
            pack25519(d, a);
            return d[0] & 1;
          }
          __name(par25519, "par25519");
          function unpack25519(o, n) {
            var i;
            for (i = 0; i < 16; i++) o[i] = n[2 * i] + (n[2 * i + 1] << 8);
            o[15] &= 32767;
          }
          __name(unpack25519, "unpack25519");
          function A(o, a, b) {
            for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
          }
          __name(A, "A");
          function Z(o, a, b) {
            for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
          }
          __name(Z, "Z");
          function M(o, a, b) {
            var v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
            v = a[0];
            t0 += v * b0;
            t1 += v * b1;
            t2 += v * b2;
            t3 += v * b3;
            t4 += v * b4;
            t5 += v * b5;
            t6 += v * b6;
            t7 += v * b7;
            t8 += v * b8;
            t9 += v * b9;
            t10 += v * b10;
            t11 += v * b11;
            t12 += v * b12;
            t13 += v * b13;
            t14 += v * b14;
            t15 += v * b15;
            v = a[1];
            t1 += v * b0;
            t2 += v * b1;
            t3 += v * b2;
            t4 += v * b3;
            t5 += v * b4;
            t6 += v * b5;
            t7 += v * b6;
            t8 += v * b7;
            t9 += v * b8;
            t10 += v * b9;
            t11 += v * b10;
            t12 += v * b11;
            t13 += v * b12;
            t14 += v * b13;
            t15 += v * b14;
            t16 += v * b15;
            v = a[2];
            t2 += v * b0;
            t3 += v * b1;
            t4 += v * b2;
            t5 += v * b3;
            t6 += v * b4;
            t7 += v * b5;
            t8 += v * b6;
            t9 += v * b7;
            t10 += v * b8;
            t11 += v * b9;
            t12 += v * b10;
            t13 += v * b11;
            t14 += v * b12;
            t15 += v * b13;
            t16 += v * b14;
            t17 += v * b15;
            v = a[3];
            t3 += v * b0;
            t4 += v * b1;
            t5 += v * b2;
            t6 += v * b3;
            t7 += v * b4;
            t8 += v * b5;
            t9 += v * b6;
            t10 += v * b7;
            t11 += v * b8;
            t12 += v * b9;
            t13 += v * b10;
            t14 += v * b11;
            t15 += v * b12;
            t16 += v * b13;
            t17 += v * b14;
            t18 += v * b15;
            v = a[4];
            t4 += v * b0;
            t5 += v * b1;
            t6 += v * b2;
            t7 += v * b3;
            t8 += v * b4;
            t9 += v * b5;
            t10 += v * b6;
            t11 += v * b7;
            t12 += v * b8;
            t13 += v * b9;
            t14 += v * b10;
            t15 += v * b11;
            t16 += v * b12;
            t17 += v * b13;
            t18 += v * b14;
            t19 += v * b15;
            v = a[5];
            t5 += v * b0;
            t6 += v * b1;
            t7 += v * b2;
            t8 += v * b3;
            t9 += v * b4;
            t10 += v * b5;
            t11 += v * b6;
            t12 += v * b7;
            t13 += v * b8;
            t14 += v * b9;
            t15 += v * b10;
            t16 += v * b11;
            t17 += v * b12;
            t18 += v * b13;
            t19 += v * b14;
            t20 += v * b15;
            v = a[6];
            t6 += v * b0;
            t7 += v * b1;
            t8 += v * b2;
            t9 += v * b3;
            t10 += v * b4;
            t11 += v * b5;
            t12 += v * b6;
            t13 += v * b7;
            t14 += v * b8;
            t15 += v * b9;
            t16 += v * b10;
            t17 += v * b11;
            t18 += v * b12;
            t19 += v * b13;
            t20 += v * b14;
            t21 += v * b15;
            v = a[7];
            t7 += v * b0;
            t8 += v * b1;
            t9 += v * b2;
            t10 += v * b3;
            t11 += v * b4;
            t12 += v * b5;
            t13 += v * b6;
            t14 += v * b7;
            t15 += v * b8;
            t16 += v * b9;
            t17 += v * b10;
            t18 += v * b11;
            t19 += v * b12;
            t20 += v * b13;
            t21 += v * b14;
            t22 += v * b15;
            v = a[8];
            t8 += v * b0;
            t9 += v * b1;
            t10 += v * b2;
            t11 += v * b3;
            t12 += v * b4;
            t13 += v * b5;
            t14 += v * b6;
            t15 += v * b7;
            t16 += v * b8;
            t17 += v * b9;
            t18 += v * b10;
            t19 += v * b11;
            t20 += v * b12;
            t21 += v * b13;
            t22 += v * b14;
            t23 += v * b15;
            v = a[9];
            t9 += v * b0;
            t10 += v * b1;
            t11 += v * b2;
            t12 += v * b3;
            t13 += v * b4;
            t14 += v * b5;
            t15 += v * b6;
            t16 += v * b7;
            t17 += v * b8;
            t18 += v * b9;
            t19 += v * b10;
            t20 += v * b11;
            t21 += v * b12;
            t22 += v * b13;
            t23 += v * b14;
            t24 += v * b15;
            v = a[10];
            t10 += v * b0;
            t11 += v * b1;
            t12 += v * b2;
            t13 += v * b3;
            t14 += v * b4;
            t15 += v * b5;
            t16 += v * b6;
            t17 += v * b7;
            t18 += v * b8;
            t19 += v * b9;
            t20 += v * b10;
            t21 += v * b11;
            t22 += v * b12;
            t23 += v * b13;
            t24 += v * b14;
            t25 += v * b15;
            v = a[11];
            t11 += v * b0;
            t12 += v * b1;
            t13 += v * b2;
            t14 += v * b3;
            t15 += v * b4;
            t16 += v * b5;
            t17 += v * b6;
            t18 += v * b7;
            t19 += v * b8;
            t20 += v * b9;
            t21 += v * b10;
            t22 += v * b11;
            t23 += v * b12;
            t24 += v * b13;
            t25 += v * b14;
            t26 += v * b15;
            v = a[12];
            t12 += v * b0;
            t13 += v * b1;
            t14 += v * b2;
            t15 += v * b3;
            t16 += v * b4;
            t17 += v * b5;
            t18 += v * b6;
            t19 += v * b7;
            t20 += v * b8;
            t21 += v * b9;
            t22 += v * b10;
            t23 += v * b11;
            t24 += v * b12;
            t25 += v * b13;
            t26 += v * b14;
            t27 += v * b15;
            v = a[13];
            t13 += v * b0;
            t14 += v * b1;
            t15 += v * b2;
            t16 += v * b3;
            t17 += v * b4;
            t18 += v * b5;
            t19 += v * b6;
            t20 += v * b7;
            t21 += v * b8;
            t22 += v * b9;
            t23 += v * b10;
            t24 += v * b11;
            t25 += v * b12;
            t26 += v * b13;
            t27 += v * b14;
            t28 += v * b15;
            v = a[14];
            t14 += v * b0;
            t15 += v * b1;
            t16 += v * b2;
            t17 += v * b3;
            t18 += v * b4;
            t19 += v * b5;
            t20 += v * b6;
            t21 += v * b7;
            t22 += v * b8;
            t23 += v * b9;
            t24 += v * b10;
            t25 += v * b11;
            t26 += v * b12;
            t27 += v * b13;
            t28 += v * b14;
            t29 += v * b15;
            v = a[15];
            t15 += v * b0;
            t16 += v * b1;
            t17 += v * b2;
            t18 += v * b3;
            t19 += v * b4;
            t20 += v * b5;
            t21 += v * b6;
            t22 += v * b7;
            t23 += v * b8;
            t24 += v * b9;
            t25 += v * b10;
            t26 += v * b11;
            t27 += v * b12;
            t28 += v * b13;
            t29 += v * b14;
            t30 += v * b15;
            t0 += 38 * t16;
            t1 += 38 * t17;
            t2 += 38 * t18;
            t3 += 38 * t19;
            t4 += 38 * t20;
            t5 += 38 * t21;
            t6 += 38 * t22;
            t7 += 38 * t23;
            t8 += 38 * t24;
            t9 += 38 * t25;
            t10 += 38 * t26;
            t11 += 38 * t27;
            t12 += 38 * t28;
            t13 += 38 * t29;
            t14 += 38 * t30;
            c = 1;
            v = t0 + c + 65535;
            c = Math.floor(v / 65536);
            t0 = v - c * 65536;
            v = t1 + c + 65535;
            c = Math.floor(v / 65536);
            t1 = v - c * 65536;
            v = t2 + c + 65535;
            c = Math.floor(v / 65536);
            t2 = v - c * 65536;
            v = t3 + c + 65535;
            c = Math.floor(v / 65536);
            t3 = v - c * 65536;
            v = t4 + c + 65535;
            c = Math.floor(v / 65536);
            t4 = v - c * 65536;
            v = t5 + c + 65535;
            c = Math.floor(v / 65536);
            t5 = v - c * 65536;
            v = t6 + c + 65535;
            c = Math.floor(v / 65536);
            t6 = v - c * 65536;
            v = t7 + c + 65535;
            c = Math.floor(v / 65536);
            t7 = v - c * 65536;
            v = t8 + c + 65535;
            c = Math.floor(v / 65536);
            t8 = v - c * 65536;
            v = t9 + c + 65535;
            c = Math.floor(v / 65536);
            t9 = v - c * 65536;
            v = t10 + c + 65535;
            c = Math.floor(v / 65536);
            t10 = v - c * 65536;
            v = t11 + c + 65535;
            c = Math.floor(v / 65536);
            t11 = v - c * 65536;
            v = t12 + c + 65535;
            c = Math.floor(v / 65536);
            t12 = v - c * 65536;
            v = t13 + c + 65535;
            c = Math.floor(v / 65536);
            t13 = v - c * 65536;
            v = t14 + c + 65535;
            c = Math.floor(v / 65536);
            t14 = v - c * 65536;
            v = t15 + c + 65535;
            c = Math.floor(v / 65536);
            t15 = v - c * 65536;
            t0 += c - 1 + 37 * (c - 1);
            c = 1;
            v = t0 + c + 65535;
            c = Math.floor(v / 65536);
            t0 = v - c * 65536;
            v = t1 + c + 65535;
            c = Math.floor(v / 65536);
            t1 = v - c * 65536;
            v = t2 + c + 65535;
            c = Math.floor(v / 65536);
            t2 = v - c * 65536;
            v = t3 + c + 65535;
            c = Math.floor(v / 65536);
            t3 = v - c * 65536;
            v = t4 + c + 65535;
            c = Math.floor(v / 65536);
            t4 = v - c * 65536;
            v = t5 + c + 65535;
            c = Math.floor(v / 65536);
            t5 = v - c * 65536;
            v = t6 + c + 65535;
            c = Math.floor(v / 65536);
            t6 = v - c * 65536;
            v = t7 + c + 65535;
            c = Math.floor(v / 65536);
            t7 = v - c * 65536;
            v = t8 + c + 65535;
            c = Math.floor(v / 65536);
            t8 = v - c * 65536;
            v = t9 + c + 65535;
            c = Math.floor(v / 65536);
            t9 = v - c * 65536;
            v = t10 + c + 65535;
            c = Math.floor(v / 65536);
            t10 = v - c * 65536;
            v = t11 + c + 65535;
            c = Math.floor(v / 65536);
            t11 = v - c * 65536;
            v = t12 + c + 65535;
            c = Math.floor(v / 65536);
            t12 = v - c * 65536;
            v = t13 + c + 65535;
            c = Math.floor(v / 65536);
            t13 = v - c * 65536;
            v = t14 + c + 65535;
            c = Math.floor(v / 65536);
            t14 = v - c * 65536;
            v = t15 + c + 65535;
            c = Math.floor(v / 65536);
            t15 = v - c * 65536;
            t0 += c - 1 + 37 * (c - 1);
            o[0] = t0;
            o[1] = t1;
            o[2] = t2;
            o[3] = t3;
            o[4] = t4;
            o[5] = t5;
            o[6] = t6;
            o[7] = t7;
            o[8] = t8;
            o[9] = t9;
            o[10] = t10;
            o[11] = t11;
            o[12] = t12;
            o[13] = t13;
            o[14] = t14;
            o[15] = t15;
          }
          __name(M, "M");
          function S(o, a) {
            M(o, a, a);
          }
          __name(S, "S");
          function inv25519(o, i) {
            var c = gf();
            var a;
            for (a = 0; a < 16; a++) c[a] = i[a];
            for (a = 253; a >= 0; a--) {
              S(c, c);
              if (a !== 2 && a !== 4) M(c, c, i);
            }
            for (a = 0; a < 16; a++) o[a] = c[a];
          }
          __name(inv25519, "inv25519");
          function pow2523(o, i) {
            var c = gf();
            var a;
            for (a = 0; a < 16; a++) c[a] = i[a];
            for (a = 250; a >= 0; a--) {
              S(c, c);
              if (a !== 1) M(c, c, i);
            }
            for (a = 0; a < 16; a++) o[a] = c[a];
          }
          __name(pow2523, "pow2523");
          function crypto_scalarmult(q, n, p) {
            var z = new Uint8Array(32);
            var x = new Float64Array(80), r, i;
            var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf();
            for (i = 0; i < 31; i++) z[i] = n[i];
            z[31] = n[31] & 127 | 64;
            z[0] &= 248;
            unpack25519(x, p);
            for (i = 0; i < 16; i++) {
              b[i] = x[i];
              d[i] = a[i] = c[i] = 0;
            }
            a[0] = d[0] = 1;
            for (i = 254; i >= 0; --i) {
              r = z[i >>> 3] >>> (i & 7) & 1;
              sel25519(a, b, r);
              sel25519(c, d, r);
              A(e, a, c);
              Z(a, a, c);
              A(c, b, d);
              Z(b, b, d);
              S(d, e);
              S(f, a);
              M(a, c, a);
              M(c, b, e);
              A(e, a, c);
              Z(a, a, c);
              S(b, a);
              Z(c, d, f);
              M(a, c, _121665);
              A(a, a, d);
              M(c, c, a);
              M(a, d, f);
              M(d, b, x);
              S(b, e);
              sel25519(a, b, r);
              sel25519(c, d, r);
            }
            for (i = 0; i < 16; i++) {
              x[i + 16] = a[i];
              x[i + 32] = c[i];
              x[i + 48] = b[i];
              x[i + 64] = d[i];
            }
            var x32 = x.subarray(32);
            var x16 = x.subarray(16);
            inv25519(x32, x32);
            M(x16, x16, x32);
            pack25519(q, x16);
            return 0;
          }
          __name(crypto_scalarmult, "crypto_scalarmult");
          function crypto_scalarmult_base(q, n) {
            return crypto_scalarmult(q, n, _9);
          }
          __name(crypto_scalarmult_base, "crypto_scalarmult_base");
          function crypto_box_keypair(y, x) {
            randombytes(x, 32);
            return crypto_scalarmult_base(y, x);
          }
          __name(crypto_box_keypair, "crypto_box_keypair");
          function crypto_box_beforenm(k, y, x) {
            var s = new Uint8Array(32);
            crypto_scalarmult(s, x, y);
            return crypto_core_hsalsa20(k, _0, s, sigma);
          }
          __name(crypto_box_beforenm, "crypto_box_beforenm");
          var crypto_box_afternm = crypto_secretbox;
          var crypto_box_open_afternm = crypto_secretbox_open;
          function crypto_box(c, m, d, n, y, x) {
            var k = new Uint8Array(32);
            crypto_box_beforenm(k, y, x);
            return crypto_box_afternm(c, m, d, n, k);
          }
          __name(crypto_box, "crypto_box");
          function crypto_box_open(m, c, d, n, y, x) {
            var k = new Uint8Array(32);
            crypto_box_beforenm(k, y, x);
            return crypto_box_open_afternm(m, c, d, n, k);
          }
          __name(crypto_box_open, "crypto_box_open");
          var K = [
            1116352408,
            3609767458,
            1899447441,
            602891725,
            3049323471,
            3964484399,
            3921009573,
            2173295548,
            961987163,
            4081628472,
            1508970993,
            3053834265,
            2453635748,
            2937671579,
            2870763221,
            3664609560,
            3624381080,
            2734883394,
            310598401,
            1164996542,
            607225278,
            1323610764,
            1426881987,
            3590304994,
            1925078388,
            4068182383,
            2162078206,
            991336113,
            2614888103,
            633803317,
            3248222580,
            3479774868,
            3835390401,
            2666613458,
            4022224774,
            944711139,
            264347078,
            2341262773,
            604807628,
            2007800933,
            770255983,
            1495990901,
            1249150122,
            1856431235,
            1555081692,
            3175218132,
            1996064986,
            2198950837,
            2554220882,
            3999719339,
            2821834349,
            766784016,
            2952996808,
            2566594879,
            3210313671,
            3203337956,
            3336571891,
            1034457026,
            3584528711,
            2466948901,
            113926993,
            3758326383,
            338241895,
            168717936,
            666307205,
            1188179964,
            773529912,
            1546045734,
            1294757372,
            1522805485,
            1396182291,
            2643833823,
            1695183700,
            2343527390,
            1986661051,
            1014477480,
            2177026350,
            1206759142,
            2456956037,
            344077627,
            2730485921,
            1290863460,
            2820302411,
            3158454273,
            3259730800,
            3505952657,
            3345764771,
            106217008,
            3516065817,
            3606008344,
            3600352804,
            1432725776,
            4094571909,
            1467031594,
            275423344,
            851169720,
            430227734,
            3100823752,
            506948616,
            1363258195,
            659060556,
            3750685593,
            883997877,
            3785050280,
            958139571,
            3318307427,
            1322822218,
            3812723403,
            1537002063,
            2003034995,
            1747873779,
            3602036899,
            1955562222,
            1575990012,
            2024104815,
            1125592928,
            2227730452,
            2716904306,
            2361852424,
            442776044,
            2428436474,
            593698344,
            2756734187,
            3733110249,
            3204031479,
            2999351573,
            3329325298,
            3815920427,
            3391569614,
            3928383900,
            3515267271,
            566280711,
            3940187606,
            3454069534,
            4118630271,
            4000239992,
            116418474,
            1914138554,
            174292421,
            2731055270,
            289380356,
            3203993006,
            460393269,
            320620315,
            685471733,
            587496836,
            852142971,
            1086792851,
            1017036298,
            365543100,
            1126000580,
            2618297676,
            1288033470,
            3409855158,
            1501505948,
            4234509866,
            1607167915,
            987167468,
            1816402316,
            1246189591
          ];
          function crypto_hashblocks_hl(hh, hl, m, n) {
            var wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h, l, a, b, c, d;
            var ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
            var pos = 0;
            while (n >= 128) {
              for (i = 0; i < 16; i++) {
                j = 8 * i + pos;
                wh[i] = m[j + 0] << 24 | m[j + 1] << 16 | m[j + 2] << 8 | m[j + 3];
                wl[i] = m[j + 4] << 24 | m[j + 5] << 16 | m[j + 6] << 8 | m[j + 7];
              }
              for (i = 0; i < 80; i++) {
                bh0 = ah0;
                bh1 = ah1;
                bh2 = ah2;
                bh3 = ah3;
                bh4 = ah4;
                bh5 = ah5;
                bh6 = ah6;
                bh7 = ah7;
                bl0 = al0;
                bl1 = al1;
                bl2 = al2;
                bl3 = al3;
                bl4 = al4;
                bl5 = al5;
                bl6 = al6;
                bl7 = al7;
                h = ah7;
                l = al7;
                a = l & 65535;
                b = l >>> 16;
                c = h & 65535;
                d = h >>> 16;
                h = (ah4 >>> 14 | al4 << 32 - 14) ^ (ah4 >>> 18 | al4 << 32 - 18) ^ (al4 >>> 41 - 32 | ah4 << 32 - (41 - 32));
                l = (al4 >>> 14 | ah4 << 32 - 14) ^ (al4 >>> 18 | ah4 << 32 - 18) ^ (ah4 >>> 41 - 32 | al4 << 32 - (41 - 32));
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                h = ah4 & ah5 ^ ~ah4 & ah6;
                l = al4 & al5 ^ ~al4 & al6;
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                h = K[i * 2];
                l = K[i * 2 + 1];
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                h = wh[i % 16];
                l = wl[i % 16];
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                b += a >>> 16;
                c += b >>> 16;
                d += c >>> 16;
                th = c & 65535 | d << 16;
                tl = a & 65535 | b << 16;
                h = th;
                l = tl;
                a = l & 65535;
                b = l >>> 16;
                c = h & 65535;
                d = h >>> 16;
                h = (ah0 >>> 28 | al0 << 32 - 28) ^ (al0 >>> 34 - 32 | ah0 << 32 - (34 - 32)) ^ (al0 >>> 39 - 32 | ah0 << 32 - (39 - 32));
                l = (al0 >>> 28 | ah0 << 32 - 28) ^ (ah0 >>> 34 - 32 | al0 << 32 - (34 - 32)) ^ (ah0 >>> 39 - 32 | al0 << 32 - (39 - 32));
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                h = ah0 & ah1 ^ ah0 & ah2 ^ ah1 & ah2;
                l = al0 & al1 ^ al0 & al2 ^ al1 & al2;
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                b += a >>> 16;
                c += b >>> 16;
                d += c >>> 16;
                bh7 = c & 65535 | d << 16;
                bl7 = a & 65535 | b << 16;
                h = bh3;
                l = bl3;
                a = l & 65535;
                b = l >>> 16;
                c = h & 65535;
                d = h >>> 16;
                h = th;
                l = tl;
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                b += a >>> 16;
                c += b >>> 16;
                d += c >>> 16;
                bh3 = c & 65535 | d << 16;
                bl3 = a & 65535 | b << 16;
                ah1 = bh0;
                ah2 = bh1;
                ah3 = bh2;
                ah4 = bh3;
                ah5 = bh4;
                ah6 = bh5;
                ah7 = bh6;
                ah0 = bh7;
                al1 = bl0;
                al2 = bl1;
                al3 = bl2;
                al4 = bl3;
                al5 = bl4;
                al6 = bl5;
                al7 = bl6;
                al0 = bl7;
                if (i % 16 === 15) {
                  for (j = 0; j < 16; j++) {
                    h = wh[j];
                    l = wl[j];
                    a = l & 65535;
                    b = l >>> 16;
                    c = h & 65535;
                    d = h >>> 16;
                    h = wh[(j + 9) % 16];
                    l = wl[(j + 9) % 16];
                    a += l & 65535;
                    b += l >>> 16;
                    c += h & 65535;
                    d += h >>> 16;
                    th = wh[(j + 1) % 16];
                    tl = wl[(j + 1) % 16];
                    h = (th >>> 1 | tl << 32 - 1) ^ (th >>> 8 | tl << 32 - 8) ^ th >>> 7;
                    l = (tl >>> 1 | th << 32 - 1) ^ (tl >>> 8 | th << 32 - 8) ^ (tl >>> 7 | th << 32 - 7);
                    a += l & 65535;
                    b += l >>> 16;
                    c += h & 65535;
                    d += h >>> 16;
                    th = wh[(j + 14) % 16];
                    tl = wl[(j + 14) % 16];
                    h = (th >>> 19 | tl << 32 - 19) ^ (tl >>> 61 - 32 | th << 32 - (61 - 32)) ^ th >>> 6;
                    l = (tl >>> 19 | th << 32 - 19) ^ (th >>> 61 - 32 | tl << 32 - (61 - 32)) ^ (tl >>> 6 | th << 32 - 6);
                    a += l & 65535;
                    b += l >>> 16;
                    c += h & 65535;
                    d += h >>> 16;
                    b += a >>> 16;
                    c += b >>> 16;
                    d += c >>> 16;
                    wh[j] = c & 65535 | d << 16;
                    wl[j] = a & 65535 | b << 16;
                  }
                }
              }
              h = ah0;
              l = al0;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = hh[0];
              l = hl[0];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              hh[0] = ah0 = c & 65535 | d << 16;
              hl[0] = al0 = a & 65535 | b << 16;
              h = ah1;
              l = al1;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = hh[1];
              l = hl[1];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              hh[1] = ah1 = c & 65535 | d << 16;
              hl[1] = al1 = a & 65535 | b << 16;
              h = ah2;
              l = al2;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = hh[2];
              l = hl[2];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              hh[2] = ah2 = c & 65535 | d << 16;
              hl[2] = al2 = a & 65535 | b << 16;
              h = ah3;
              l = al3;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = hh[3];
              l = hl[3];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              hh[3] = ah3 = c & 65535 | d << 16;
              hl[3] = al3 = a & 65535 | b << 16;
              h = ah4;
              l = al4;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = hh[4];
              l = hl[4];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              hh[4] = ah4 = c & 65535 | d << 16;
              hl[4] = al4 = a & 65535 | b << 16;
              h = ah5;
              l = al5;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = hh[5];
              l = hl[5];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              hh[5] = ah5 = c & 65535 | d << 16;
              hl[5] = al5 = a & 65535 | b << 16;
              h = ah6;
              l = al6;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = hh[6];
              l = hl[6];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              hh[6] = ah6 = c & 65535 | d << 16;
              hl[6] = al6 = a & 65535 | b << 16;
              h = ah7;
              l = al7;
              a = l & 65535;
              b = l >>> 16;
              c = h & 65535;
              d = h >>> 16;
              h = hh[7];
              l = hl[7];
              a += l & 65535;
              b += l >>> 16;
              c += h & 65535;
              d += h >>> 16;
              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;
              hh[7] = ah7 = c & 65535 | d << 16;
              hl[7] = al7 = a & 65535 | b << 16;
              pos += 128;
              n -= 128;
            }
            return n;
          }
          __name(crypto_hashblocks_hl, "crypto_hashblocks_hl");
          function crypto_hash(out, m, n) {
            var hh = new Int32Array(8), hl = new Int32Array(8), x = new Uint8Array(256), i, b = n;
            hh[0] = 1779033703;
            hh[1] = 3144134277;
            hh[2] = 1013904242;
            hh[3] = 2773480762;
            hh[4] = 1359893119;
            hh[5] = 2600822924;
            hh[6] = 528734635;
            hh[7] = 1541459225;
            hl[0] = 4089235720;
            hl[1] = 2227873595;
            hl[2] = 4271175723;
            hl[3] = 1595750129;
            hl[4] = 2917565137;
            hl[5] = 725511199;
            hl[6] = 4215389547;
            hl[7] = 327033209;
            crypto_hashblocks_hl(hh, hl, m, n);
            n %= 128;
            for (i = 0; i < n; i++) x[i] = m[b - n + i];
            x[n] = 128;
            n = 256 - 128 * (n < 112 ? 1 : 0);
            x[n - 9] = 0;
            ts64(x, n - 8, b / 536870912 | 0, b << 3);
            crypto_hashblocks_hl(hh, hl, x, n);
            for (i = 0; i < 8; i++) ts64(out, 8 * i, hh[i], hl[i]);
            return 0;
          }
          __name(crypto_hash, "crypto_hash");
          function add(p, q) {
            var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
            Z(a, p[1], p[0]);
            Z(t, q[1], q[0]);
            M(a, a, t);
            A(b, p[0], p[1]);
            A(t, q[0], q[1]);
            M(b, b, t);
            M(c, p[3], q[3]);
            M(c, c, D2);
            M(d, p[2], q[2]);
            A(d, d, d);
            Z(e, b, a);
            Z(f, d, c);
            A(g, d, c);
            A(h, b, a);
            M(p[0], e, f);
            M(p[1], h, g);
            M(p[2], g, f);
            M(p[3], e, h);
          }
          __name(add, "add");
          function cswap(p, q, b) {
            var i;
            for (i = 0; i < 4; i++) {
              sel25519(p[i], q[i], b);
            }
          }
          __name(cswap, "cswap");
          function pack(r, p) {
            var tx = gf(), ty = gf(), zi = gf();
            inv25519(zi, p[2]);
            M(tx, p[0], zi);
            M(ty, p[1], zi);
            pack25519(r, ty);
            r[31] ^= par25519(tx) << 7;
          }
          __name(pack, "pack");
          function scalarmult(p, q, s) {
            var b, i;
            set25519(p[0], gf0);
            set25519(p[1], gf1);
            set25519(p[2], gf1);
            set25519(p[3], gf0);
            for (i = 255; i >= 0; --i) {
              b = s[i / 8 | 0] >> (i & 7) & 1;
              cswap(p, q, b);
              add(q, p);
              add(p, p);
              cswap(p, q, b);
            }
          }
          __name(scalarmult, "scalarmult");
          function scalarbase(p, s) {
            var q = [gf(), gf(), gf(), gf()];
            set25519(q[0], X);
            set25519(q[1], Y);
            set25519(q[2], gf1);
            M(q[3], X, Y);
            scalarmult(p, q, s);
          }
          __name(scalarbase, "scalarbase");
          function crypto_sign_keypair(pk, sk, seeded) {
            var d = new Uint8Array(64);
            var p = [gf(), gf(), gf(), gf()];
            var i;
            if (!seeded) randombytes(sk, 32);
            crypto_hash(d, sk, 32);
            d[0] &= 248;
            d[31] &= 127;
            d[31] |= 64;
            scalarbase(p, d);
            pack(pk, p);
            for (i = 0; i < 32; i++) sk[i + 32] = pk[i];
            return 0;
          }
          __name(crypto_sign_keypair, "crypto_sign_keypair");
          var L = new Float64Array([237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16]);
          function modL(r, x) {
            var carry, i, j, k;
            for (i = 63; i >= 32; --i) {
              carry = 0;
              for (j = i - 32, k = i - 12; j < k; ++j) {
                x[j] += carry - 16 * x[i] * L[j - (i - 32)];
                carry = Math.floor((x[j] + 128) / 256);
                x[j] -= carry * 256;
              }
              x[j] += carry;
              x[i] = 0;
            }
            carry = 0;
            for (j = 0; j < 32; j++) {
              x[j] += carry - (x[31] >> 4) * L[j];
              carry = x[j] >> 8;
              x[j] &= 255;
            }
            for (j = 0; j < 32; j++) x[j] -= carry * L[j];
            for (i = 0; i < 32; i++) {
              x[i + 1] += x[i] >> 8;
              r[i] = x[i] & 255;
            }
          }
          __name(modL, "modL");
          function reduce(r) {
            var x = new Float64Array(64), i;
            for (i = 0; i < 64; i++) x[i] = r[i];
            for (i = 0; i < 64; i++) r[i] = 0;
            modL(r, x);
          }
          __name(reduce, "reduce");
          function crypto_sign(sm, m, n, sk) {
            var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
            var i, j, x = new Float64Array(64);
            var p = [gf(), gf(), gf(), gf()];
            crypto_hash(d, sk, 32);
            d[0] &= 248;
            d[31] &= 127;
            d[31] |= 64;
            var smlen = n + 64;
            for (i = 0; i < n; i++) sm[64 + i] = m[i];
            for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];
            crypto_hash(r, sm.subarray(32), n + 32);
            reduce(r);
            scalarbase(p, r);
            pack(sm, p);
            for (i = 32; i < 64; i++) sm[i] = sk[i];
            crypto_hash(h, sm, n + 64);
            reduce(h);
            for (i = 0; i < 64; i++) x[i] = 0;
            for (i = 0; i < 32; i++) x[i] = r[i];
            for (i = 0; i < 32; i++) {
              for (j = 0; j < 32; j++) {
                x[i + j] += h[i] * d[j];
              }
            }
            modL(sm.subarray(32), x);
            return smlen;
          }
          __name(crypto_sign, "crypto_sign");
          function unpackneg(r, p) {
            var t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
            set25519(r[2], gf1);
            unpack25519(r[1], p);
            S(num, r[1]);
            M(den, num, D);
            Z(num, num, r[2]);
            A(den, r[2], den);
            S(den2, den);
            S(den4, den2);
            M(den6, den4, den2);
            M(t, den6, num);
            M(t, t, den);
            pow2523(t, t);
            M(t, t, num);
            M(t, t, den);
            M(t, t, den);
            M(r[0], t, den);
            S(chk, r[0]);
            M(chk, chk, den);
            if (neq25519(chk, num)) M(r[0], r[0], I);
            S(chk, r[0]);
            M(chk, chk, den);
            if (neq25519(chk, num)) return -1;
            if (par25519(r[0]) === p[31] >> 7) Z(r[0], gf0, r[0]);
            M(r[3], r[0], r[1]);
            return 0;
          }
          __name(unpackneg, "unpackneg");
          function crypto_sign_open(m, sm, n, pk) {
            var i;
            var t = new Uint8Array(32), h = new Uint8Array(64);
            var p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
            if (n < 64) return -1;
            if (unpackneg(q, pk)) return -1;
            for (i = 0; i < n; i++) m[i] = sm[i];
            for (i = 0; i < 32; i++) m[i + 32] = pk[i];
            crypto_hash(h, m, n);
            reduce(h);
            scalarmult(p, q, h);
            scalarbase(q, sm.subarray(32));
            add(p, q);
            pack(t, p);
            n -= 64;
            if (crypto_verify_32(sm, 0, t, 0)) {
              for (i = 0; i < n; i++) m[i] = 0;
              return -1;
            }
            for (i = 0; i < n; i++) m[i] = sm[i + 64];
            return n;
          }
          __name(crypto_sign_open, "crypto_sign_open");
          var crypto_secretbox_KEYBYTES = 32, crypto_secretbox_NONCEBYTES = 24, crypto_secretbox_ZEROBYTES = 32, crypto_secretbox_BOXZEROBYTES = 16, crypto_scalarmult_BYTES = 32, crypto_scalarmult_SCALARBYTES = 32, crypto_box_PUBLICKEYBYTES = 32, crypto_box_SECRETKEYBYTES = 32, crypto_box_BEFORENMBYTES = 32, crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES, crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES, crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES, crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32, crypto_hash_BYTES = 64;
          nacl.lowlevel = {
            crypto_core_hsalsa20,
            crypto_stream_xor,
            crypto_stream,
            crypto_stream_salsa20_xor,
            crypto_stream_salsa20,
            crypto_onetimeauth,
            crypto_onetimeauth_verify,
            crypto_verify_16,
            crypto_verify_32,
            crypto_secretbox,
            crypto_secretbox_open,
            crypto_scalarmult,
            crypto_scalarmult_base,
            crypto_box_beforenm,
            crypto_box_afternm,
            crypto_box,
            crypto_box_open,
            crypto_box_keypair,
            crypto_hash,
            crypto_sign,
            crypto_sign_keypair,
            crypto_sign_open,
            crypto_secretbox_KEYBYTES,
            crypto_secretbox_NONCEBYTES,
            crypto_secretbox_ZEROBYTES,
            crypto_secretbox_BOXZEROBYTES,
            crypto_scalarmult_BYTES,
            crypto_scalarmult_SCALARBYTES,
            crypto_box_PUBLICKEYBYTES,
            crypto_box_SECRETKEYBYTES,
            crypto_box_BEFORENMBYTES,
            crypto_box_NONCEBYTES,
            crypto_box_ZEROBYTES,
            crypto_box_BOXZEROBYTES,
            crypto_sign_BYTES,
            crypto_sign_PUBLICKEYBYTES,
            crypto_sign_SECRETKEYBYTES,
            crypto_sign_SEEDBYTES,
            crypto_hash_BYTES,
            gf,
            D,
            L,
            pack25519,
            unpack25519,
            M,
            A,
            S,
            Z,
            pow2523,
            add,
            set25519,
            modL,
            scalarmult,
            scalarbase
          };
          function checkLengths(k, n) {
            if (k.length !== crypto_secretbox_KEYBYTES) throw new Error("bad key size");
            if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error("bad nonce size");
          }
          __name(checkLengths, "checkLengths");
          function checkBoxLengths(pk, sk) {
            if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error("bad public key size");
            if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error("bad secret key size");
          }
          __name(checkBoxLengths, "checkBoxLengths");
          function checkArrayTypes() {
            for (var i = 0; i < arguments.length; i++) {
              if (!(arguments[i] instanceof Uint8Array))
                throw new TypeError("unexpected type, use Uint8Array");
            }
          }
          __name(checkArrayTypes, "checkArrayTypes");
          function cleanup(arr) {
            for (var i = 0; i < arr.length; i++) arr[i] = 0;
          }
          __name(cleanup, "cleanup");
          nacl.randomBytes = function(n) {
            var b = new Uint8Array(n);
            randombytes(b, n);
            return b;
          };
          nacl.secretbox = function(msg, nonce, key) {
            checkArrayTypes(msg, nonce, key);
            checkLengths(key, nonce);
            var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
            var c = new Uint8Array(m.length);
            for (var i = 0; i < msg.length; i++) m[i + crypto_secretbox_ZEROBYTES] = msg[i];
            crypto_secretbox(c, m, m.length, nonce, key);
            return c.subarray(crypto_secretbox_BOXZEROBYTES);
          };
          nacl.secretbox.open = function(box, nonce, key) {
            checkArrayTypes(box, nonce, key);
            checkLengths(key, nonce);
            var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
            var m = new Uint8Array(c.length);
            for (var i = 0; i < box.length; i++) c[i + crypto_secretbox_BOXZEROBYTES] = box[i];
            if (c.length < 32) return null;
            if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
            return m.subarray(crypto_secretbox_ZEROBYTES);
          };
          nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
          nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
          nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;
          nacl.scalarMult = function(n, p) {
            checkArrayTypes(n, p);
            if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
            if (p.length !== crypto_scalarmult_BYTES) throw new Error("bad p size");
            var q = new Uint8Array(crypto_scalarmult_BYTES);
            crypto_scalarmult(q, n, p);
            return q;
          };
          nacl.scalarMult.base = function(n) {
            checkArrayTypes(n);
            if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
            var q = new Uint8Array(crypto_scalarmult_BYTES);
            crypto_scalarmult_base(q, n);
            return q;
          };
          nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
          nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;
          nacl.box = function(msg, nonce, publicKey, secretKey) {
            var k = nacl.box.before(publicKey, secretKey);
            return nacl.secretbox(msg, nonce, k);
          };
          nacl.box.before = function(publicKey, secretKey) {
            checkArrayTypes(publicKey, secretKey);
            checkBoxLengths(publicKey, secretKey);
            var k = new Uint8Array(crypto_box_BEFORENMBYTES);
            crypto_box_beforenm(k, publicKey, secretKey);
            return k;
          };
          nacl.box.after = nacl.secretbox;
          nacl.box.open = function(msg, nonce, publicKey, secretKey) {
            var k = nacl.box.before(publicKey, secretKey);
            return nacl.secretbox.open(msg, nonce, k);
          };
          nacl.box.open.after = nacl.secretbox.open;
          nacl.box.keyPair = function() {
            var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
            var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
            crypto_box_keypair(pk, sk);
            return { publicKey: pk, secretKey: sk };
          };
          nacl.box.keyPair.fromSecretKey = function(secretKey) {
            checkArrayTypes(secretKey);
            if (secretKey.length !== crypto_box_SECRETKEYBYTES)
              throw new Error("bad secret key size");
            var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
            crypto_scalarmult_base(pk, secretKey);
            return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
          };
          nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
          nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
          nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
          nacl.box.nonceLength = crypto_box_NONCEBYTES;
          nacl.box.overheadLength = nacl.secretbox.overheadLength;
          nacl.sign = function(msg, secretKey) {
            checkArrayTypes(msg, secretKey);
            if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
              throw new Error("bad secret key size");
            var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
            crypto_sign(signedMsg, msg, msg.length, secretKey);
            return signedMsg;
          };
          nacl.sign.open = function(signedMsg, publicKey) {
            checkArrayTypes(signedMsg, publicKey);
            if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
              throw new Error("bad public key size");
            var tmp = new Uint8Array(signedMsg.length);
            var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
            if (mlen < 0) return null;
            var m = new Uint8Array(mlen);
            for (var i = 0; i < m.length; i++) m[i] = tmp[i];
            return m;
          };
          nacl.sign.detached = function(msg, secretKey) {
            var signedMsg = nacl.sign(msg, secretKey);
            var sig = new Uint8Array(crypto_sign_BYTES);
            for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
            return sig;
          };
          nacl.sign.detached.verify = function(msg, sig, publicKey) {
            checkArrayTypes(msg, sig, publicKey);
            if (sig.length !== crypto_sign_BYTES)
              throw new Error("bad signature size");
            if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
              throw new Error("bad public key size");
            var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
            var m = new Uint8Array(crypto_sign_BYTES + msg.length);
            var i;
            for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
            for (i = 0; i < msg.length; i++) sm[i + crypto_sign_BYTES] = msg[i];
            return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
          };
          nacl.sign.keyPair = function() {
            var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
            var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
            crypto_sign_keypair(pk, sk);
            return { publicKey: pk, secretKey: sk };
          };
          nacl.sign.keyPair.fromSecretKey = function(secretKey) {
            checkArrayTypes(secretKey);
            if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
              throw new Error("bad secret key size");
            var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
            for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32 + i];
            return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
          };
          nacl.sign.keyPair.fromSeed = function(seed) {
            checkArrayTypes(seed);
            if (seed.length !== crypto_sign_SEEDBYTES)
              throw new Error("bad seed size");
            var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
            var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
            for (var i = 0; i < 32; i++) sk[i] = seed[i];
            crypto_sign_keypair(pk, sk, true);
            return { publicKey: pk, secretKey: sk };
          };
          nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
          nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
          nacl.sign.seedLength = crypto_sign_SEEDBYTES;
          nacl.sign.signatureLength = crypto_sign_BYTES;
          nacl.hash = function(msg) {
            checkArrayTypes(msg);
            var h = new Uint8Array(crypto_hash_BYTES);
            crypto_hash(h, msg, msg.length);
            return h;
          };
          nacl.hash.hashLength = crypto_hash_BYTES;
          nacl.verify = function(x, y) {
            checkArrayTypes(x, y);
            if (x.length === 0 || y.length === 0) return false;
            if (x.length !== y.length) return false;
            return vn(x, 0, y, 0, x.length) === 0 ? true : false;
          };
          nacl.setPRNG = function(fn) {
            randombytes = fn;
          };
          (function() {
            var crypto = typeof self !== "undefined" ? self.crypto || self.msCrypto : null;
            if (crypto && crypto.getRandomValues) {
              var QUOTA = 65536;
              nacl.setPRNG(function(x, n) {
                var i, v = new Uint8Array(n);
                for (i = 0; i < n; i += QUOTA) {
                  crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
                }
                for (i = 0; i < n; i++) x[i] = v[i];
                cleanup(v);
              });
            } else if (true) {
              crypto = __webpack_require__(3);
              if (crypto && crypto.randomBytes) {
                nacl.setPRNG(function(x, n) {
                  var i, v = crypto.randomBytes(n);
                  for (i = 0; i < n; i++) x[i] = v[i];
                  cleanup(v);
                });
              }
            }
          })();
        })(module2.exports ? module2.exports : self.nacl = self.nacl || {});
      },
      /* 21 */
      /***/
      function(module2, exports2, __webpack_require__) {
        module2.exports = __webpack_require__(47).default;
      },
      /* 22 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("buffer");
      },
      /* 23 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("events");
      },
      /* 24 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Stream = __webpack_require__(5).Stream, util = __webpack_require__(0);
        var IO = /* @__PURE__ */ __name(function(driver) {
          this.readable = this.writable = true;
          this._paused = false;
          this._driver = driver;
        }, "IO");
        util.inherits(IO, Stream);
        IO.prototype.pause = function() {
          this._paused = true;
          this._driver.messages._paused = true;
        };
        IO.prototype.resume = function() {
          this._paused = false;
          this.emit("drain");
          var messages = this._driver.messages;
          messages._paused = false;
          messages.emit("drain");
        };
        IO.prototype.write = function(chunk) {
          if (!this.writable) return false;
          this._driver.parse(chunk);
          return !this._paused;
        };
        IO.prototype.end = function(chunk) {
          if (!this.writable) return;
          if (chunk !== void 0) this.write(chunk);
          this.writable = false;
          var messages = this._driver.messages;
          if (messages.readable) {
            messages.readable = messages.writable = false;
            messages.emit("end");
          }
        };
        IO.prototype.destroy = function() {
          this.end();
        };
        var Messages = /* @__PURE__ */ __name(function(driver) {
          this.readable = this.writable = true;
          this._paused = false;
          this._driver = driver;
        }, "Messages");
        util.inherits(Messages, Stream);
        Messages.prototype.pause = function() {
          this._driver.io._paused = true;
        };
        Messages.prototype.resume = function() {
          this._driver.io._paused = false;
          this._driver.io.emit("drain");
        };
        Messages.prototype.write = function(message) {
          if (!this.writable) return false;
          if (typeof message === "string") this._driver.text(message);
          else this._driver.binary(message);
          return !this._paused;
        };
        Messages.prototype.end = function(message) {
          if (message !== void 0) this.write(message);
        };
        Messages.prototype.destroy = function() {
        };
        exports2.IO = IO;
        exports2.Messages = Messages;
      },
      /* 25 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Buffer2 = __webpack_require__(1).Buffer;
        var StreamReader = /* @__PURE__ */ __name(function() {
          this._queue = [];
          this._queueSize = 0;
          this._offset = 0;
        }, "StreamReader");
        StreamReader.prototype.put = function(buffer) {
          if (!buffer || buffer.length === 0) return;
          if (!Buffer2.isBuffer(buffer)) buffer = Buffer2.from(buffer);
          this._queue.push(buffer);
          this._queueSize += buffer.length;
        };
        StreamReader.prototype.read = function(length) {
          if (length > this._queueSize) return null;
          if (length === 0) return Buffer2.alloc(0);
          this._queueSize -= length;
          var queue = this._queue, remain = length, first = queue[0], buffers, buffer;
          if (first.length >= length) {
            if (first.length === length) {
              return queue.shift();
            } else {
              buffer = first.slice(0, length);
              queue[0] = first.slice(length);
              return buffer;
            }
          }
          for (var i = 0, n = queue.length; i < n; i++) {
            if (remain < queue[i].length) break;
            remain -= queue[i].length;
          }
          buffers = queue.splice(0, i);
          if (remain > 0 && queue.length > 0) {
            buffers.push(queue[0].slice(0, remain));
            queue[0] = queue[0].slice(remain);
          }
          return Buffer2.concat(buffers, length);
        };
        StreamReader.prototype.eachByte = function(callback, context) {
          var buffer, n, index;
          while (this._queue.length > 0) {
            buffer = this._queue[0];
            n = buffer.length;
            while (this._offset < n) {
              index = this._offset;
              this._offset += 1;
              callback.call(context, buffer[index]);
            }
            this._offset = 0;
            this._queue.shift();
          }
        };
        module2.exports = StreamReader;
      },
      /* 26 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Buffer2 = __webpack_require__(1).Buffer, crypto = __webpack_require__(3), url = __webpack_require__(6), util = __webpack_require__(0), HttpParser = __webpack_require__(10), Base = __webpack_require__(2), Hybi = __webpack_require__(12), Proxy = __webpack_require__(36);
        var Client = /* @__PURE__ */ __name(function(_url, options) {
          this.version = "hybi-" + Hybi.VERSION;
          Hybi.call(this, null, _url, options);
          this.readyState = -1;
          this._key = Client.generateKey();
          this._accept = Hybi.generateAccept(this._key);
          this._http = new HttpParser("response");
          var uri = url.parse(this.url), auth = uri.auth && Buffer2.from(uri.auth, "utf8").toString("base64");
          if (this.VALID_PROTOCOLS.indexOf(uri.protocol) < 0)
            throw new Error(this.url + " is not a valid WebSocket URL");
          this._pathname = (uri.pathname || "/") + (uri.search || "");
          this._headers.set("Host", uri.host);
          this._headers.set("Upgrade", "websocket");
          this._headers.set("Connection", "Upgrade");
          this._headers.set("Sec-WebSocket-Key", this._key);
          this._headers.set("Sec-WebSocket-Version", Hybi.VERSION);
          if (this._protocols.length > 0)
            this._headers.set("Sec-WebSocket-Protocol", this._protocols.join(", "));
          if (auth)
            this._headers.set("Authorization", "Basic " + auth);
        }, "Client");
        util.inherits(Client, Hybi);
        Client.generateKey = function() {
          return crypto.randomBytes(16).toString("base64");
        };
        var instance = {
          VALID_PROTOCOLS: ["ws:", "wss:"],
          proxy: /* @__PURE__ */ __name(function(origin, options) {
            return new Proxy(this, origin, options);
          }, "proxy"),
          start: /* @__PURE__ */ __name(function() {
            if (this.readyState !== -1) return false;
            this._write(this._handshakeRequest());
            this.readyState = 0;
            return true;
          }, "start"),
          parse: /* @__PURE__ */ __name(function(chunk) {
            if (this.readyState === 3) return;
            if (this.readyState > 0) return Hybi.prototype.parse.call(this, chunk);
            this._http.parse(chunk);
            if (!this._http.isComplete()) return;
            this._validateHandshake();
            if (this.readyState === 3) return;
            this._open();
            this.parse(this._http.body);
          }, "parse"),
          _handshakeRequest: /* @__PURE__ */ __name(function() {
            var extensions = this._extensions.generateOffer();
            if (extensions)
              this._headers.set("Sec-WebSocket-Extensions", extensions);
            var start = "GET " + this._pathname + " HTTP/1.1", headers = [start, this._headers.toString(), ""];
            return Buffer2.from(headers.join("\r\n"), "utf8");
          }, "_handshakeRequest"),
          _failHandshake: /* @__PURE__ */ __name(function(message) {
            message = "Error during WebSocket handshake: " + message;
            this.readyState = 3;
            this.emit("error", new Error(message));
            this.emit("close", new Base.CloseEvent(this.ERRORS.protocol_error, message));
          }, "_failHandshake"),
          _validateHandshake: /* @__PURE__ */ __name(function() {
            this.statusCode = this._http.statusCode;
            this.headers = this._http.headers;
            if (this._http.error)
              return this._failHandshake(this._http.error.message);
            if (this._http.statusCode !== 101)
              return this._failHandshake("Unexpected response code: " + this._http.statusCode);
            var headers = this._http.headers, upgrade = headers["upgrade"] || "", connection = headers["connection"] || "", accept = headers["sec-websocket-accept"] || "", protocol = headers["sec-websocket-protocol"] || "";
            if (upgrade === "")
              return this._failHandshake("'Upgrade' header is missing");
            if (upgrade.toLowerCase() !== "websocket")
              return this._failHandshake("'Upgrade' header value is not 'WebSocket'");
            if (connection === "")
              return this._failHandshake("'Connection' header is missing");
            if (connection.toLowerCase() !== "upgrade")
              return this._failHandshake("'Connection' header value is not 'Upgrade'");
            if (accept !== this._accept)
              return this._failHandshake("Sec-WebSocket-Accept mismatch");
            this.protocol = null;
            if (protocol !== "") {
              if (this._protocols.indexOf(protocol) < 0)
                return this._failHandshake("Sec-WebSocket-Protocol mismatch");
              else
                this.protocol = protocol;
            }
            try {
              this._extensions.activate(this.headers["sec-websocket-extensions"]);
            } catch (e) {
              return this._failHandshake(e.message);
            }
          }, "_validateHandshake")
        };
        for (var key in instance)
          Client.prototype[key] = instance[key];
        module2.exports = Client;
      },
      /* 27 */
      /***/
      function(module2, exports2, __webpack_require__) {
        var assert = __webpack_require__(28);
        exports2.HTTPParser = HTTPParser;
        function HTTPParser(type) {
          assert.ok(type === HTTPParser.REQUEST || type === HTTPParser.RESPONSE || type === void 0);
          if (type === void 0) {
          } else {
            this.initialize(type);
          }
          this.maxHeaderSize = HTTPParser.maxHeaderSize;
        }
        __name(HTTPParser, "HTTPParser");
        HTTPParser.prototype.initialize = function(type, async_resource) {
          assert.ok(type === HTTPParser.REQUEST || type === HTTPParser.RESPONSE);
          this.type = type;
          this.state = type + "_LINE";
          this.info = {
            headers: [],
            upgrade: false
          };
          this.trailers = [];
          this.line = "";
          this.isChunked = false;
          this.connection = "";
          this.headerSize = 0;
          this.body_bytes = null;
          this.isUserCall = false;
          this.hadError = false;
        };
        HTTPParser.encoding = "ascii";
        HTTPParser.maxHeaderSize = 80 * 1024;
        HTTPParser.REQUEST = "REQUEST";
        HTTPParser.RESPONSE = "RESPONSE";
        var kOnHeaders = HTTPParser.kOnHeaders = 1;
        var kOnHeadersComplete = HTTPParser.kOnHeadersComplete = 2;
        var kOnBody = HTTPParser.kOnBody = 3;
        var kOnMessageComplete = HTTPParser.kOnMessageComplete = 4;
        HTTPParser.prototype[kOnHeaders] = HTTPParser.prototype[kOnHeadersComplete] = HTTPParser.prototype[kOnBody] = HTTPParser.prototype[kOnMessageComplete] = function() {
        };
        var compatMode0_12 = true;
        Object.defineProperty(HTTPParser, "kOnExecute", {
          get: /* @__PURE__ */ __name(function() {
            compatMode0_12 = false;
            return 99;
          }, "get")
        });
        var methods = exports2.methods = HTTPParser.methods = [
          "DELETE",
          "GET",
          "HEAD",
          "POST",
          "PUT",
          "CONNECT",
          "OPTIONS",
          "TRACE",
          "COPY",
          "LOCK",
          "MKCOL",
          "MOVE",
          "PROPFIND",
          "PROPPATCH",
          "SEARCH",
          "UNLOCK",
          "BIND",
          "REBIND",
          "UNBIND",
          "ACL",
          "REPORT",
          "MKACTIVITY",
          "CHECKOUT",
          "MERGE",
          "M-SEARCH",
          "NOTIFY",
          "SUBSCRIBE",
          "UNSUBSCRIBE",
          "PATCH",
          "PURGE",
          "MKCALENDAR",
          "LINK",
          "UNLINK",
          "SOURCE"
        ];
        var method_connect = methods.indexOf("CONNECT");
        HTTPParser.prototype.reinitialize = HTTPParser;
        HTTPParser.prototype.close = HTTPParser.prototype.pause = HTTPParser.prototype.resume = HTTPParser.prototype.free = function() {
        };
        HTTPParser.prototype._compatMode0_11 = false;
        HTTPParser.prototype.getAsyncId = function() {
          return 0;
        };
        var headerState = {
          REQUEST_LINE: true,
          RESPONSE_LINE: true,
          HEADER: true
        };
        HTTPParser.prototype.execute = function(chunk, start, length) {
          if (!(this instanceof HTTPParser)) {
            throw new TypeError("not a HTTPParser");
          }
          start = start || 0;
          length = typeof length === "number" ? length : chunk.length;
          this.chunk = chunk;
          this.offset = start;
          var end = this.end = start + length;
          try {
            while (this.offset < end) {
              if (this[this.state]()) {
                break;
              }
            }
          } catch (err) {
            if (this.isUserCall) {
              throw err;
            }
            this.hadError = true;
            return err;
          }
          this.chunk = null;
          length = this.offset - start;
          if (headerState[this.state]) {
            this.headerSize += length;
            if (this.headerSize > (this.maxHeaderSize || HTTPParser.maxHeaderSize)) {
              return new Error("max header size exceeded");
            }
          }
          return length;
        };
        var stateFinishAllowed = {
          REQUEST_LINE: true,
          RESPONSE_LINE: true,
          BODY_RAW: true
        };
        HTTPParser.prototype.finish = function() {
          if (this.hadError) {
            return;
          }
          if (!stateFinishAllowed[this.state]) {
            return new Error("invalid state for EOF");
          }
          if (this.state === "BODY_RAW") {
            this.userCall()(this[kOnMessageComplete]());
          }
        };
        HTTPParser.prototype.consume = HTTPParser.prototype.unconsume = HTTPParser.prototype.getCurrentBuffer = function() {
        };
        HTTPParser.prototype.userCall = function() {
          this.isUserCall = true;
          var self2 = this;
          return function(ret) {
            self2.isUserCall = false;
            return ret;
          };
        };
        HTTPParser.prototype.nextRequest = function() {
          this.userCall()(this[kOnMessageComplete]());
          this.reinitialize(this.type);
        };
        HTTPParser.prototype.consumeLine = function() {
          var end = this.end, chunk = this.chunk;
          for (var i = this.offset; i < end; i++) {
            if (chunk[i] === 10) {
              var line = this.line + chunk.toString(HTTPParser.encoding, this.offset, i);
              if (line.charAt(line.length - 1) === "\r") {
                line = line.substr(0, line.length - 1);
              }
              this.line = "";
              this.offset = i + 1;
              return line;
            }
          }
          this.line += chunk.toString(HTTPParser.encoding, this.offset, this.end);
          this.offset = this.end;
        };
        var headerExp = /^([^: \t]+):[ \t]*((?:.*[^ \t])|)/;
        var headerContinueExp = /^[ \t]+(.*[^ \t])/;
        HTTPParser.prototype.parseHeader = function(line, headers) {
          if (line.indexOf("\r") !== -1) {
            throw parseErrorCode("HPE_LF_EXPECTED");
          }
          var match = headerExp.exec(line);
          var k = match && match[1];
          if (k) {
            headers.push(k);
            headers.push(match[2]);
          } else {
            var matchContinue = headerContinueExp.exec(line);
            if (matchContinue && headers.length) {
              if (headers[headers.length - 1]) {
                headers[headers.length - 1] += " ";
              }
              headers[headers.length - 1] += matchContinue[1];
            }
          }
        };
        var requestExp = /^([A-Z-]+) ([^ ]+) HTTP\/(\d)\.(\d)$/;
        HTTPParser.prototype.REQUEST_LINE = function() {
          var line = this.consumeLine();
          if (!line) {
            return;
          }
          var match = requestExp.exec(line);
          if (match === null) {
            throw parseErrorCode("HPE_INVALID_CONSTANT");
          }
          this.info.method = this._compatMode0_11 ? match[1] : methods.indexOf(match[1]);
          if (this.info.method === -1) {
            throw new Error("invalid request method");
          }
          this.info.url = match[2];
          this.info.versionMajor = +match[3];
          this.info.versionMinor = +match[4];
          this.body_bytes = 0;
          this.state = "HEADER";
        };
        var responseExp = /^HTTP\/(\d)\.(\d) (\d{3}) ?(.*)$/;
        HTTPParser.prototype.RESPONSE_LINE = function() {
          var line = this.consumeLine();
          if (!line) {
            return;
          }
          var match = responseExp.exec(line);
          if (match === null) {
            throw parseErrorCode("HPE_INVALID_CONSTANT");
          }
          this.info.versionMajor = +match[1];
          this.info.versionMinor = +match[2];
          var statusCode = this.info.statusCode = +match[3];
          this.info.statusMessage = match[4];
          if ((statusCode / 100 | 0) === 1 || statusCode === 204 || statusCode === 304) {
            this.body_bytes = 0;
          }
          this.state = "HEADER";
        };
        HTTPParser.prototype.shouldKeepAlive = function() {
          if (this.info.versionMajor > 0 && this.info.versionMinor > 0) {
            if (this.connection.indexOf("close") !== -1) {
              return false;
            }
          } else if (this.connection.indexOf("keep-alive") === -1) {
            return false;
          }
          if (this.body_bytes !== null || this.isChunked) {
            return true;
          }
          return false;
        };
        HTTPParser.prototype.HEADER = function() {
          var line = this.consumeLine();
          if (line === void 0) {
            return;
          }
          var info = this.info;
          if (line) {
            this.parseHeader(line, info.headers);
          } else {
            var headers = info.headers;
            var hasContentLength = false;
            var currentContentLengthValue;
            var hasUpgradeHeader = false;
            for (var i = 0; i < headers.length; i += 2) {
              switch (headers[i].toLowerCase()) {
                case "transfer-encoding":
                  this.isChunked = headers[i + 1].toLowerCase() === "chunked";
                  break;
                case "content-length":
                  currentContentLengthValue = +headers[i + 1];
                  if (hasContentLength) {
                    if (currentContentLengthValue !== this.body_bytes) {
                      throw parseErrorCode("HPE_UNEXPECTED_CONTENT_LENGTH");
                    }
                  } else {
                    hasContentLength = true;
                    this.body_bytes = currentContentLengthValue;
                  }
                  break;
                case "connection":
                  this.connection += headers[i + 1].toLowerCase();
                  break;
                case "upgrade":
                  hasUpgradeHeader = true;
                  break;
              }
            }
            if (this.isChunked && hasContentLength) {
              hasContentLength = false;
              this.body_bytes = null;
            }
            if (hasUpgradeHeader && this.connection.indexOf("upgrade") != -1) {
              info.upgrade = this.type === HTTPParser.REQUEST || info.statusCode === 101;
            } else {
              info.upgrade = info.method === method_connect;
            }
            if (this.isChunked && info.upgrade) {
              this.isChunked = false;
            }
            info.shouldKeepAlive = this.shouldKeepAlive();
            var skipBody;
            if (compatMode0_12) {
              skipBody = this.userCall()(this[kOnHeadersComplete](info));
            } else {
              skipBody = this.userCall()(this[kOnHeadersComplete](
                info.versionMajor,
                info.versionMinor,
                info.headers,
                info.method,
                info.url,
                info.statusCode,
                info.statusMessage,
                info.upgrade,
                info.shouldKeepAlive
              ));
            }
            if (skipBody === 2) {
              this.nextRequest();
              return true;
            } else if (this.isChunked && !skipBody) {
              this.state = "BODY_CHUNKHEAD";
            } else if (skipBody || this.body_bytes === 0) {
              this.nextRequest();
              return info.upgrade;
            } else if (this.body_bytes === null) {
              this.state = "BODY_RAW";
            } else {
              this.state = "BODY_SIZED";
            }
          }
        };
        HTTPParser.prototype.BODY_CHUNKHEAD = function() {
          var line = this.consumeLine();
          if (line === void 0) {
            return;
          }
          this.body_bytes = parseInt(line, 16);
          if (!this.body_bytes) {
            this.state = "BODY_CHUNKTRAILERS";
          } else {
            this.state = "BODY_CHUNK";
          }
        };
        HTTPParser.prototype.BODY_CHUNK = function() {
          var length = Math.min(this.end - this.offset, this.body_bytes);
          this.userCall()(this[kOnBody](this.chunk, this.offset, length));
          this.offset += length;
          this.body_bytes -= length;
          if (!this.body_bytes) {
            this.state = "BODY_CHUNKEMPTYLINE";
          }
        };
        HTTPParser.prototype.BODY_CHUNKEMPTYLINE = function() {
          var line = this.consumeLine();
          if (line === void 0) {
            return;
          }
          assert.equal(line, "");
          this.state = "BODY_CHUNKHEAD";
        };
        HTTPParser.prototype.BODY_CHUNKTRAILERS = function() {
          var line = this.consumeLine();
          if (line === void 0) {
            return;
          }
          if (line) {
            this.parseHeader(line, this.trailers);
          } else {
            if (this.trailers.length) {
              this.userCall()(this[kOnHeaders](this.trailers, ""));
            }
            this.nextRequest();
          }
        };
        HTTPParser.prototype.BODY_RAW = function() {
          var length = this.end - this.offset;
          this.userCall()(this[kOnBody](this.chunk, this.offset, length));
          this.offset = this.end;
        };
        HTTPParser.prototype.BODY_SIZED = function() {
          var length = Math.min(this.end - this.offset, this.body_bytes);
          this.userCall()(this[kOnBody](this.chunk, this.offset, length));
          this.offset += length;
          this.body_bytes -= length;
          if (!this.body_bytes) {
            this.nextRequest();
          }
        };
        ["Headers", "HeadersComplete", "Body", "MessageComplete"].forEach(function(name) {
          var k = HTTPParser["kOn" + name];
          Object.defineProperty(HTTPParser.prototype, "on" + name, {
            get: /* @__PURE__ */ __name(function() {
              return this[k];
            }, "get"),
            set: /* @__PURE__ */ __name(function(to) {
              this._compatMode0_11 = true;
              method_connect = "CONNECT";
              return this[k] = to;
            }, "set")
          });
        });
        function parseErrorCode(code) {
          var err = new Error("Parse Error");
          err.code = code;
          return err;
        }
        __name(parseErrorCode, "parseErrorCode");
      },
      /* 28 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("assert");
      },
      /* 29 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Parser = __webpack_require__(30), Pipeline = __webpack_require__(31);
        var Extensions = /* @__PURE__ */ __name(function() {
          this._rsv1 = this._rsv2 = this._rsv3 = null;
          this._byName = {};
          this._inOrder = [];
          this._sessions = [];
          this._index = {};
        }, "Extensions");
        Extensions.MESSAGE_OPCODES = [1, 2];
        var instance = {
          add: /* @__PURE__ */ __name(function(ext) {
            if (typeof ext.name !== "string") throw new TypeError("extension.name must be a string");
            if (ext.type !== "permessage") throw new TypeError('extension.type must be "permessage"');
            if (typeof ext.rsv1 !== "boolean") throw new TypeError("extension.rsv1 must be true or false");
            if (typeof ext.rsv2 !== "boolean") throw new TypeError("extension.rsv2 must be true or false");
            if (typeof ext.rsv3 !== "boolean") throw new TypeError("extension.rsv3 must be true or false");
            if (this._byName.hasOwnProperty(ext.name))
              throw new TypeError('An extension with name "' + ext.name + '" is already registered');
            this._byName[ext.name] = ext;
            this._inOrder.push(ext);
          }, "add"),
          generateOffer: /* @__PURE__ */ __name(function() {
            var sessions = [], offer = [], index = {};
            this._inOrder.forEach(function(ext) {
              var session = ext.createClientSession();
              if (!session) return;
              var record = [ext, session];
              sessions.push(record);
              index[ext.name] = record;
              var offers = session.generateOffer();
              offers = offers ? [].concat(offers) : [];
              offers.forEach(function(off) {
                offer.push(Parser.serializeParams(ext.name, off));
              }, this);
            }, this);
            this._sessions = sessions;
            this._index = index;
            return offer.length > 0 ? offer.join(", ") : null;
          }, "generateOffer"),
          activate: /* @__PURE__ */ __name(function(header) {
            var responses = Parser.parseHeader(header), sessions = [];
            responses.eachOffer(function(name, params) {
              var record = this._index[name];
              if (!record)
                throw new Error('Server sent an extension response for unknown extension "' + name + '"');
              var ext = record[0], session = record[1], reserved = this._reserved(ext);
              if (reserved)
                throw new Error("Server sent two extension responses that use the RSV" + reserved[0] + ' bit: "' + reserved[1] + '" and "' + ext.name + '"');
              if (session.activate(params) !== true)
                throw new Error("Server sent unacceptable extension parameters: " + Parser.serializeParams(name, params));
              this._reserve(ext);
              sessions.push(record);
            }, this);
            this._sessions = sessions;
            this._pipeline = new Pipeline(sessions);
          }, "activate"),
          generateResponse: /* @__PURE__ */ __name(function(header) {
            var sessions = [], response = [], offers = Parser.parseHeader(header);
            this._inOrder.forEach(function(ext) {
              var offer = offers.byName(ext.name);
              if (offer.length === 0 || this._reserved(ext)) return;
              var session = ext.createServerSession(offer);
              if (!session) return;
              this._reserve(ext);
              sessions.push([ext, session]);
              response.push(Parser.serializeParams(ext.name, session.generateResponse()));
            }, this);
            this._sessions = sessions;
            this._pipeline = new Pipeline(sessions);
            return response.length > 0 ? response.join(", ") : null;
          }, "generateResponse"),
          validFrameRsv: /* @__PURE__ */ __name(function(frame) {
            var allowed = { rsv1: false, rsv2: false, rsv3: false }, ext;
            if (Extensions.MESSAGE_OPCODES.indexOf(frame.opcode) >= 0) {
              for (var i = 0, n = this._sessions.length; i < n; i++) {
                ext = this._sessions[i][0];
                allowed.rsv1 = allowed.rsv1 || ext.rsv1;
                allowed.rsv2 = allowed.rsv2 || ext.rsv2;
                allowed.rsv3 = allowed.rsv3 || ext.rsv3;
              }
            }
            return (allowed.rsv1 || !frame.rsv1) && (allowed.rsv2 || !frame.rsv2) && (allowed.rsv3 || !frame.rsv3);
          }, "validFrameRsv"),
          processIncomingMessage: /* @__PURE__ */ __name(function(message, callback, context) {
            this._pipeline.processIncomingMessage(message, callback, context);
          }, "processIncomingMessage"),
          processOutgoingMessage: /* @__PURE__ */ __name(function(message, callback, context) {
            this._pipeline.processOutgoingMessage(message, callback, context);
          }, "processOutgoingMessage"),
          close: /* @__PURE__ */ __name(function(callback, context) {
            if (!this._pipeline) return callback.call(context);
            this._pipeline.close(callback, context);
          }, "close"),
          _reserve: /* @__PURE__ */ __name(function(ext) {
            this._rsv1 = this._rsv1 || ext.rsv1 && ext.name;
            this._rsv2 = this._rsv2 || ext.rsv2 && ext.name;
            this._rsv3 = this._rsv3 || ext.rsv3 && ext.name;
          }, "_reserve"),
          _reserved: /* @__PURE__ */ __name(function(ext) {
            if (this._rsv1 && ext.rsv1) return [1, this._rsv1];
            if (this._rsv2 && ext.rsv2) return [2, this._rsv2];
            if (this._rsv3 && ext.rsv3) return [3, this._rsv3];
            return false;
          }, "_reserved")
        };
        for (var key in instance)
          Extensions.prototype[key] = instance[key];
        module2.exports = Extensions;
      },
      /* 30 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var TOKEN = /([!#\$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+)/, NOTOKEN = /([^!#\$%&'\*\+\-\.\^_`\|~0-9A-Za-z])/g, QUOTED = /"((?:\\[\x00-\x7f]|[^\x00-\x08\x0a-\x1f\x7f"\\])*)"/, PARAM = new RegExp(TOKEN.source + "(?:=(?:" + TOKEN.source + "|" + QUOTED.source + "))?"), EXT = new RegExp(TOKEN.source + "(?: *; *" + PARAM.source + ")*", "g"), EXT_LIST = new RegExp("^" + EXT.source + "(?: *, *" + EXT.source + ")*$"), NUMBER = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/;
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var Parser = {
          parseHeader: /* @__PURE__ */ __name(function(header) {
            var offers = new Offers();
            if (header === "" || header === void 0) return offers;
            if (!EXT_LIST.test(header))
              throw new SyntaxError("Invalid Sec-WebSocket-Extensions header: " + header);
            var values = header.match(EXT);
            values.forEach(function(value) {
              var params = value.match(new RegExp(PARAM.source, "g")), name = params.shift(), offer = {};
              params.forEach(function(param) {
                var args = param.match(PARAM), key = args[1], data;
                if (args[2] !== void 0) {
                  data = args[2];
                } else if (args[3] !== void 0) {
                  data = args[3].replace(/\\/g, "");
                } else {
                  data = true;
                }
                if (NUMBER.test(data)) data = parseFloat(data);
                if (hasOwnProperty.call(offer, key)) {
                  offer[key] = [].concat(offer[key]);
                  offer[key].push(data);
                } else {
                  offer[key] = data;
                }
              }, this);
              offers.push(name, offer);
            }, this);
            return offers;
          }, "parseHeader"),
          serializeParams: /* @__PURE__ */ __name(function(name, params) {
            var values = [];
            var print = /* @__PURE__ */ __name(function(key2, value) {
              if (value instanceof Array) {
                value.forEach(function(v) {
                  print(key2, v);
                });
              } else if (value === true) {
                values.push(key2);
              } else if (typeof value === "number") {
                values.push(key2 + "=" + value);
              } else if (NOTOKEN.test(value)) {
                values.push(key2 + '="' + value.replace(/"/g, '\\"') + '"');
              } else {
                values.push(key2 + "=" + value);
              }
            }, "print");
            for (var key in params) print(key, params[key]);
            return [name].concat(values).join("; ");
          }, "serializeParams")
        };
        var Offers = /* @__PURE__ */ __name(function() {
          this._byName = {};
          this._inOrder = [];
        }, "Offers");
        Offers.prototype.push = function(name, params) {
          if (!hasOwnProperty.call(this._byName, name))
            this._byName[name] = [];
          this._byName[name].push(params);
          this._inOrder.push({ name, params });
        };
        Offers.prototype.eachOffer = function(callback, context) {
          var list = this._inOrder;
          for (var i = 0, n = list.length; i < n; i++)
            callback.call(context, list[i].name, list[i].params);
        };
        Offers.prototype.byName = function(name) {
          return this._byName[name] || [];
        };
        Offers.prototype.toArray = function() {
          return this._inOrder.slice();
        };
        module2.exports = Parser;
      },
      /* 31 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Cell = __webpack_require__(32), Pledge = __webpack_require__(14);
        var Pipeline = /* @__PURE__ */ __name(function(sessions) {
          this._cells = sessions.map(function(session) {
            return new Cell(session);
          });
          this._stopped = { incoming: false, outgoing: false };
        }, "Pipeline");
        Pipeline.prototype.processIncomingMessage = function(message, callback, context) {
          if (this._stopped.incoming) return;
          this._loop("incoming", this._cells.length - 1, -1, -1, message, callback, context);
        };
        Pipeline.prototype.processOutgoingMessage = function(message, callback, context) {
          if (this._stopped.outgoing) return;
          this._loop("outgoing", 0, this._cells.length, 1, message, callback, context);
        };
        Pipeline.prototype.close = function(callback, context) {
          this._stopped = { incoming: true, outgoing: true };
          var closed = this._cells.map(function(a) {
            return a.close();
          });
          if (callback)
            Pledge.all(closed).then(function() {
              callback.call(context);
            });
        };
        Pipeline.prototype._loop = function(direction, start, end, step, message, callback, context) {
          var cells = this._cells, n = cells.length, self2 = this;
          while (n--) cells[n].pending(direction);
          var pipe = /* @__PURE__ */ __name(function(index, error, msg) {
            if (index === end) return callback.call(context, error, msg);
            cells[index][direction](error, msg, function(err, m) {
              if (err) self2._stopped[direction] = true;
              pipe(index + step, err, m);
            });
          }, "pipe");
          pipe(start, null, message);
        };
        module2.exports = Pipeline;
      },
      /* 32 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Functor = __webpack_require__(33), Pledge = __webpack_require__(14);
        var Cell = /* @__PURE__ */ __name(function(tuple) {
          this._ext = tuple[0];
          this._session = tuple[1];
          this._functors = {
            incoming: new Functor(this._session, "processIncomingMessage"),
            outgoing: new Functor(this._session, "processOutgoingMessage")
          };
        }, "Cell");
        Cell.prototype.pending = function(direction) {
          var functor = this._functors[direction];
          if (!functor._stopped) functor.pending += 1;
        };
        Cell.prototype.incoming = function(error, message, callback, context) {
          this._exec("incoming", error, message, callback, context);
        };
        Cell.prototype.outgoing = function(error, message, callback, context) {
          this._exec("outgoing", error, message, callback, context);
        };
        Cell.prototype.close = function() {
          this._closed = this._closed || new Pledge();
          this._doClose();
          return this._closed;
        };
        Cell.prototype._exec = function(direction, error, message, callback, context) {
          this._functors[direction].call(error, message, function(err, msg) {
            if (err) err.message = this._ext.name + ": " + err.message;
            callback.call(context, err, msg);
            this._doClose();
          }, this);
        };
        Cell.prototype._doClose = function() {
          var fin = this._functors.incoming, fout = this._functors.outgoing;
          if (!this._closed || fin.pending + fout.pending !== 0) return;
          if (this._session) this._session.close();
          this._session = null;
          this._closed.done();
        };
        module2.exports = Cell;
      },
      /* 33 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var RingBuffer = __webpack_require__(13);
        var Functor = /* @__PURE__ */ __name(function(session, method) {
          this._session = session;
          this._method = method;
          this._queue = new RingBuffer(Functor.QUEUE_SIZE);
          this._stopped = false;
          this.pending = 0;
        }, "Functor");
        Functor.QUEUE_SIZE = 8;
        Functor.prototype.call = function(error, message, callback, context) {
          if (this._stopped) return;
          var record = { error, message, callback, context, done: false }, called = false, self2 = this;
          this._queue.push(record);
          if (record.error) {
            record.done = true;
            this._stop();
            return this._flushQueue();
          }
          var handler = /* @__PURE__ */ __name(function(err, msg) {
            if (!(called ^ (called = true))) return;
            if (err) {
              self2._stop();
              record.error = err;
              record.message = null;
            } else {
              record.message = msg;
            }
            record.done = true;
            self2._flushQueue();
          }, "handler");
          try {
            this._session[this._method](message, handler);
          } catch (err) {
            handler(err);
          }
        };
        Functor.prototype._stop = function() {
          this.pending = this._queue.length;
          this._stopped = true;
        };
        Functor.prototype._flushQueue = function() {
          var queue = this._queue, record;
          while (queue.length > 0 && queue.peek().done) {
            record = queue.shift();
            if (record.error) {
              this.pending = 0;
              queue.clear();
            } else {
              this.pending -= 1;
            }
            record.callback.call(record.context, record.error, record.message);
          }
        };
        module2.exports = Functor;
      },
      /* 34 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Frame = /* @__PURE__ */ __name(function() {
        }, "Frame");
        var instance = {
          final: false,
          rsv1: false,
          rsv2: false,
          rsv3: false,
          opcode: null,
          masked: false,
          maskingKey: null,
          lengthBytes: 1,
          length: 0,
          payload: null
        };
        for (var key in instance)
          Frame.prototype[key] = instance[key];
        module2.exports = Frame;
      },
      /* 35 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Buffer2 = __webpack_require__(1).Buffer;
        var Message = /* @__PURE__ */ __name(function() {
          this.rsv1 = false;
          this.rsv2 = false;
          this.rsv3 = false;
          this.opcode = null;
          this.length = 0;
          this._chunks = [];
        }, "Message");
        var instance = {
          read: /* @__PURE__ */ __name(function() {
            return this.data = this.data || Buffer2.concat(this._chunks, this.length);
          }, "read"),
          pushFrame: /* @__PURE__ */ __name(function(frame) {
            this.rsv1 = this.rsv1 || frame.rsv1;
            this.rsv2 = this.rsv2 || frame.rsv2;
            this.rsv3 = this.rsv3 || frame.rsv3;
            if (this.opcode === null) this.opcode = frame.opcode;
            this._chunks.push(frame.payload);
            this.length += frame.length;
          }, "pushFrame")
        };
        for (var key in instance)
          Message.prototype[key] = instance[key];
        module2.exports = Message;
      },
      /* 36 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Buffer2 = __webpack_require__(1).Buffer, Stream = __webpack_require__(5).Stream, url = __webpack_require__(6), util = __webpack_require__(0), Base = __webpack_require__(2), Headers = __webpack_require__(9), HttpParser = __webpack_require__(10);
        var PORTS = { "ws:": 80, "wss:": 443 };
        var Proxy = /* @__PURE__ */ __name(function(client, origin, options) {
          this._client = client;
          this._http = new HttpParser("response");
          this._origin = typeof client.url === "object" ? client.url : url.parse(client.url);
          this._url = typeof origin === "object" ? origin : url.parse(origin);
          this._options = options || {};
          this._state = 0;
          this.readable = this.writable = true;
          this._paused = false;
          this._headers = new Headers();
          this._headers.set("Host", this._origin.host);
          this._headers.set("Connection", "keep-alive");
          this._headers.set("Proxy-Connection", "keep-alive");
          var auth = this._url.auth && Buffer2.from(this._url.auth, "utf8").toString("base64");
          if (auth) this._headers.set("Proxy-Authorization", "Basic " + auth);
        }, "Proxy");
        util.inherits(Proxy, Stream);
        var instance = {
          setHeader: /* @__PURE__ */ __name(function(name, value) {
            if (this._state !== 0) return false;
            this._headers.set(name, value);
            return true;
          }, "setHeader"),
          start: /* @__PURE__ */ __name(function() {
            if (this._state !== 0) return false;
            this._state = 1;
            var origin = this._origin, port = origin.port || PORTS[origin.protocol], start = "CONNECT " + origin.hostname + ":" + port + " HTTP/1.1";
            var headers = [start, this._headers.toString(), ""];
            this.emit("data", Buffer2.from(headers.join("\r\n"), "utf8"));
            return true;
          }, "start"),
          pause: /* @__PURE__ */ __name(function() {
            this._paused = true;
          }, "pause"),
          resume: /* @__PURE__ */ __name(function() {
            this._paused = false;
            this.emit("drain");
          }, "resume"),
          write: /* @__PURE__ */ __name(function(chunk) {
            if (!this.writable) return false;
            this._http.parse(chunk);
            if (!this._http.isComplete()) return !this._paused;
            this.statusCode = this._http.statusCode;
            this.headers = this._http.headers;
            if (this.statusCode === 200) {
              this.emit("connect", new Base.ConnectEvent());
            } else {
              var message = "Can't establish a connection to the server at " + this._origin.href;
              this.emit("error", new Error(message));
            }
            this.end();
            return !this._paused;
          }, "write"),
          end: /* @__PURE__ */ __name(function(chunk) {
            if (!this.writable) return;
            if (chunk !== void 0) this.write(chunk);
            this.readable = this.writable = false;
            this.emit("close");
            this.emit("end");
          }, "end"),
          destroy: /* @__PURE__ */ __name(function() {
            this.end();
          }, "destroy")
        };
        for (var key in instance)
          Proxy.prototype[key] = instance[key];
        module2.exports = Proxy;
      },
      /* 37 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var util = __webpack_require__(0), HttpParser = __webpack_require__(10), Base = __webpack_require__(2), Draft75 = __webpack_require__(15), Draft76 = __webpack_require__(38), Hybi = __webpack_require__(12);
        var Server = /* @__PURE__ */ __name(function(options) {
          Base.call(this, null, null, options);
          this._http = new HttpParser("request");
        }, "Server");
        util.inherits(Server, Base);
        var instance = {
          EVENTS: ["open", "message", "error", "close", "ping", "pong"],
          _bindEventListeners: /* @__PURE__ */ __name(function() {
            this.messages.on("error", function() {
            });
            this.on("error", function() {
            });
          }, "_bindEventListeners"),
          parse: /* @__PURE__ */ __name(function(chunk) {
            if (this._delegate) return this._delegate.parse(chunk);
            this._http.parse(chunk);
            if (!this._http.isComplete()) return;
            this.method = this._http.method;
            this.url = this._http.url;
            this.headers = this._http.headers;
            this.body = this._http.body;
            var self2 = this;
            this._delegate = Server.http(this, this._options);
            this._delegate.messages = this.messages;
            this._delegate.io = this.io;
            this._open();
            this.EVENTS.forEach(function(event) {
              this._delegate.on(event, function(e) {
                self2.emit(event, e);
              });
            }, this);
            this.protocol = this._delegate.protocol;
            this.version = this._delegate.version;
            this.parse(this._http.body);
            this.emit("connect", new Base.ConnectEvent());
          }, "parse"),
          _open: /* @__PURE__ */ __name(function() {
            this.__queue.forEach(function(msg) {
              this._delegate[msg[0]].apply(this._delegate, msg[1]);
            }, this);
            this.__queue = [];
          }, "_open")
        };
        ["addExtension", "setHeader", "start", "frame", "text", "binary", "ping", "close"].forEach(function(method) {
          instance[method] = function() {
            if (this._delegate) {
              return this._delegate[method].apply(this._delegate, arguments);
            } else {
              this.__queue.push([method, arguments]);
              return true;
            }
          };
        });
        for (var key in instance)
          Server.prototype[key] = instance[key];
        Server.isSecureRequest = function(request) {
          if (request.connection && request.connection.authorized !== void 0) return true;
          if (request.socket && request.socket.secure) return true;
          var headers = request.headers;
          if (!headers) return false;
          if (headers["https"] === "on") return true;
          if (headers["x-forwarded-ssl"] === "on") return true;
          if (headers["x-forwarded-scheme"] === "https") return true;
          if (headers["x-forwarded-proto"] === "https") return true;
          return false;
        };
        Server.determineUrl = function(request) {
          var scheme = this.isSecureRequest(request) ? "wss:" : "ws:";
          return scheme + "//" + request.headers.host + request.url;
        };
        Server.http = function(request, options) {
          options = options || {};
          if (options.requireMasking === void 0) options.requireMasking = true;
          var headers = request.headers, version = headers["sec-websocket-version"], key2 = headers["sec-websocket-key"], key1 = headers["sec-websocket-key1"], key22 = headers["sec-websocket-key2"], url = this.determineUrl(request);
          if (version || key2)
            return new Hybi(request, url, options);
          else if (key1 || key22)
            return new Draft76(request, url, options);
          else
            return new Draft75(request, url, options);
        };
        module2.exports = Server;
      },
      /* 38 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Buffer2 = __webpack_require__(1).Buffer, Base = __webpack_require__(2), Draft75 = __webpack_require__(15), crypto = __webpack_require__(3), util = __webpack_require__(0);
        var numberFromKey = /* @__PURE__ */ __name(function(key2) {
          return parseInt((key2.match(/[0-9]/g) || []).join(""), 10);
        }, "numberFromKey");
        var spacesInKey = /* @__PURE__ */ __name(function(key2) {
          return (key2.match(/ /g) || []).length;
        }, "spacesInKey");
        var Draft76 = /* @__PURE__ */ __name(function(request, url, options) {
          Draft75.apply(this, arguments);
          this._stage = -1;
          this._body = [];
          this.version = "hixie-76";
          this._headers.clear();
          this._headers.set("Upgrade", "WebSocket");
          this._headers.set("Connection", "Upgrade");
          this._headers.set("Sec-WebSocket-Origin", this._request.headers.origin);
          this._headers.set("Sec-WebSocket-Location", this.url);
        }, "Draft76");
        util.inherits(Draft76, Draft75);
        var instance = {
          BODY_SIZE: 8,
          start: /* @__PURE__ */ __name(function() {
            if (!Draft75.prototype.start.call(this)) return false;
            this._started = true;
            this._sendHandshakeBody();
            return true;
          }, "start"),
          close: /* @__PURE__ */ __name(function() {
            if (this.readyState === 3) return false;
            if (this.readyState === 1) this._write(Buffer2.from([255, 0]));
            this.readyState = 3;
            this.emit("close", new Base.CloseEvent(null, null));
            return true;
          }, "close"),
          _handshakeResponse: /* @__PURE__ */ __name(function() {
            var headers = this._request.headers, key1 = headers["sec-websocket-key1"], key2 = headers["sec-websocket-key2"];
            if (!key1) throw new Error("Missing required header: Sec-WebSocket-Key1");
            if (!key2) throw new Error("Missing required header: Sec-WebSocket-Key2");
            var number1 = numberFromKey(key1), spaces1 = spacesInKey(key1), number2 = numberFromKey(key2), spaces2 = spacesInKey(key2);
            if (number1 % spaces1 !== 0 || number2 % spaces2 !== 0)
              throw new Error("Client sent invalid Sec-WebSocket-Key headers");
            this._keyValues = [number1 / spaces1, number2 / spaces2];
            var start = "HTTP/1.1 101 WebSocket Protocol Handshake", headers = [start, this._headers.toString(), ""];
            return Buffer2.from(headers.join("\r\n"), "binary");
          }, "_handshakeResponse"),
          _handshakeSignature: /* @__PURE__ */ __name(function() {
            if (this._body.length < this.BODY_SIZE) return null;
            var md5 = crypto.createHash("md5"), buffer = Buffer2.allocUnsafe(8 + this.BODY_SIZE);
            buffer.writeUInt32BE(this._keyValues[0], 0);
            buffer.writeUInt32BE(this._keyValues[1], 4);
            Buffer2.from(this._body).copy(buffer, 8, 0, this.BODY_SIZE);
            md5.update(buffer);
            return Buffer2.from(md5.digest("binary"), "binary");
          }, "_handshakeSignature"),
          _sendHandshakeBody: /* @__PURE__ */ __name(function() {
            if (!this._started) return;
            var signature = this._handshakeSignature();
            if (!signature) return;
            this._write(signature);
            this._stage = 0;
            this._open();
            if (this._body.length > this.BODY_SIZE)
              this.parse(this._body.slice(this.BODY_SIZE));
          }, "_sendHandshakeBody"),
          _parseLeadingByte: /* @__PURE__ */ __name(function(octet) {
            if (octet !== 255)
              return Draft75.prototype._parseLeadingByte.call(this, octet);
            this._closing = true;
            this._length = 0;
            this._stage = 1;
          }, "_parseLeadingByte")
        };
        for (var key in instance)
          Draft76.prototype[key] = instance[key];
        module2.exports = Draft76;
      },
      /* 39 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var util = __webpack_require__(0), net = __webpack_require__(40), tls = __webpack_require__(41), url = __webpack_require__(6), driver = __webpack_require__(4), API = __webpack_require__(11), Event = __webpack_require__(7);
        var DEFAULT_PORTS = { "http:": 80, "https:": 443, "ws:": 80, "wss:": 443 }, SECURE_PROTOCOLS = ["https:", "wss:"];
        var Client = /* @__PURE__ */ __name(function(_url, protocols, options) {
          options = options || {};
          this.url = _url;
          this._driver = driver.client(this.url, { maxLength: options.maxLength, protocols });
          ["open", "error"].forEach(function(event) {
            this._driver.on(event, function() {
              self2.headers = self2._driver.headers;
              self2.statusCode = self2._driver.statusCode;
            });
          }, this);
          var proxy = options.proxy || {}, endpoint = url.parse(proxy.origin || this.url), port = endpoint.port || DEFAULT_PORTS[endpoint.protocol], secure = SECURE_PROTOCOLS.indexOf(endpoint.protocol) >= 0, onConnect = /* @__PURE__ */ __name(function() {
            self2._onConnect();
          }, "onConnect"), netOptions = options.net || {}, originTLS = options.tls || {}, socketTLS = proxy.origin ? proxy.tls || {} : originTLS, self2 = this;
          netOptions.host = socketTLS.host = endpoint.hostname;
          netOptions.port = socketTLS.port = port;
          originTLS.ca = originTLS.ca || options.ca;
          socketTLS.servername = socketTLS.servername || endpoint.hostname;
          this._stream = secure ? tls.connect(socketTLS, onConnect) : net.connect(netOptions, onConnect);
          if (proxy.origin) this._configureProxy(proxy, originTLS);
          API.call(this, options);
        }, "Client");
        util.inherits(Client, API);
        Client.prototype._onConnect = function() {
          var worker = this._proxy || this._driver;
          worker.start();
        };
        Client.prototype._configureProxy = function(proxy, originTLS) {
          var uri = url.parse(this.url), secure = SECURE_PROTOCOLS.indexOf(uri.protocol) >= 0, self2 = this, name;
          this._proxy = this._driver.proxy(proxy.origin);
          if (proxy.headers) {
            for (name in proxy.headers) this._proxy.setHeader(name, proxy.headers[name]);
          }
          this._proxy.pipe(this._stream, { end: false });
          this._stream.pipe(this._proxy);
          this._proxy.on("connect", function() {
            if (secure) {
              var options = { socket: self2._stream, servername: uri.hostname };
              for (name in originTLS) options[name] = originTLS[name];
              self2._stream = tls.connect(options);
              self2._configureStream();
            }
            self2._driver.io.pipe(self2._stream);
            self2._stream.pipe(self2._driver.io);
            self2._driver.start();
          });
          this._proxy.on("error", function(error) {
            self2._driver.emit("error", error);
          });
        };
        module2.exports = Client;
      },
      /* 40 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("net");
      },
      /* 41 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("tls");
      },
      /* 42 */
      /***/
      function(module2, exports2, __webpack_require__) {
        "use strict";
        var Stream = __webpack_require__(5).Stream, util = __webpack_require__(0), driver = __webpack_require__(4), Headers = __webpack_require__(9), API = __webpack_require__(11), EventTarget = __webpack_require__(16), Event = __webpack_require__(7);
        var EventSource = /* @__PURE__ */ __name(function(request, response, options) {
          this.writable = true;
          options = options || {};
          this._stream = response.socket;
          this._ping = options.ping || this.DEFAULT_PING;
          this._retry = options.retry || this.DEFAULT_RETRY;
          var scheme = driver.isSecureRequest(request) ? "https:" : "http:";
          this.url = scheme + "//" + request.headers.host + request.url;
          this.lastEventId = request.headers["last-event-id"] || "";
          this.readyState = API.CONNECTING;
          var headers = new Headers(), self2 = this;
          if (options.headers) {
            for (var key2 in options.headers) headers.set(key2, options.headers[key2]);
          }
          if (!this._stream || !this._stream.writable) return;
          process.nextTick(function() {
            self2._open();
          });
          this._stream.setTimeout(0);
          this._stream.setNoDelay(true);
          var handshake = "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-cache, no-store\r\nConnection: close\r\n" + headers.toString() + "\r\nretry: " + Math.floor(this._retry * 1e3) + "\r\n\r\n";
          this._write(handshake);
          this._stream.on("drain", function() {
            self2.emit("drain");
          });
          if (this._ping)
            this._pingTimer = setInterval(function() {
              self2.ping();
            }, this._ping * 1e3);
          ["error", "end"].forEach(function(event) {
            self2._stream.on(event, function() {
              self2.close();
            });
          });
        }, "EventSource");
        util.inherits(EventSource, Stream);
        EventSource.isEventSource = function(request) {
          if (request.method !== "GET") return false;
          var accept = (request.headers.accept || "").split(/\s*,\s*/);
          return accept.indexOf("text/event-stream") >= 0;
        };
        var instance = {
          DEFAULT_PING: 10,
          DEFAULT_RETRY: 5,
          _write: /* @__PURE__ */ __name(function(chunk) {
            if (!this.writable) return false;
            try {
              return this._stream.write(chunk, "utf8");
            } catch (e) {
              return false;
            }
          }, "_write"),
          _open: /* @__PURE__ */ __name(function() {
            if (this.readyState !== API.CONNECTING) return;
            this.readyState = API.OPEN;
            var event = new Event("open");
            event.initEvent("open", false, false);
            this.dispatchEvent(event);
          }, "_open"),
          write: /* @__PURE__ */ __name(function(message) {
            return this.send(message);
          }, "write"),
          end: /* @__PURE__ */ __name(function(message) {
            if (message !== void 0) this.write(message);
            this.close();
          }, "end"),
          send: /* @__PURE__ */ __name(function(message, options) {
            if (this.readyState > API.OPEN) return false;
            message = String(message).replace(/(\r\n|\r|\n)/g, "$1data: ");
            options = options || {};
            var frame = "";
            if (options.event) frame += "event: " + options.event + "\r\n";
            if (options.id) frame += "id: " + options.id + "\r\n";
            frame += "data: " + message + "\r\n\r\n";
            return this._write(frame);
          }, "send"),
          ping: /* @__PURE__ */ __name(function() {
            return this._write(":\r\n\r\n");
          }, "ping"),
          close: /* @__PURE__ */ __name(function() {
            if (this.readyState > API.OPEN) return false;
            this.readyState = API.CLOSED;
            this.writable = false;
            if (this._pingTimer) clearInterval(this._pingTimer);
            if (this._stream) this._stream.end();
            var event = new Event("close");
            event.initEvent("close", false, false);
            this.dispatchEvent(event);
            return true;
          }, "close")
        };
        for (var method in instance) EventSource.prototype[method] = instance[method];
        for (var key in EventTarget) EventSource.prototype[key] = EventTarget[key];
        module2.exports = EventSource;
      },
      /* 43 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("child_process");
      },
      /* 44 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("fs");
      },
      /* 45 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("http");
      },
      /* 46 */
      /***/
      function(module2, exports2) {
        module2.exports = __require("https");
      },
      /* 47 */
      /***/
      function(module2, __webpack_exports__, __webpack_require__) {
        "use strict";
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, "default", function() {
          return (
            /* binding */
            pusher_with_encryption_PusherWithEncryption
          );
        });
        function encode(s) {
          return btoa(utob(s));
        }
        __name(encode, "encode");
        var fromCharCode = String.fromCharCode;
        var b64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var b64tab = {};
        for (var base64_i = 0, l = b64chars.length; base64_i < l; base64_i++) {
          b64tab[b64chars.charAt(base64_i)] = base64_i;
        }
        var cb_utob = /* @__PURE__ */ __name(function(c) {
          var cc = c.charCodeAt(0);
          return cc < 128 ? c : cc < 2048 ? fromCharCode(192 | cc >>> 6) + fromCharCode(128 | cc & 63) : fromCharCode(224 | cc >>> 12 & 15) + fromCharCode(128 | cc >>> 6 & 63) + fromCharCode(128 | cc & 63);
        }, "cb_utob");
        var utob = /* @__PURE__ */ __name(function(u) {
          return u.replace(/[^\x00-\x7F]/g, cb_utob);
        }, "utob");
        var cb_encode = /* @__PURE__ */ __name(function(ccc) {
          var padlen = [0, 2, 1][ccc.length % 3];
          var ord = ccc.charCodeAt(0) << 16 | (ccc.length > 1 ? ccc.charCodeAt(1) : 0) << 8 | (ccc.length > 2 ? ccc.charCodeAt(2) : 0);
          var chars = [
            b64chars.charAt(ord >>> 18),
            b64chars.charAt(ord >>> 12 & 63),
            padlen >= 2 ? "=" : b64chars.charAt(ord >>> 6 & 63),
            padlen >= 1 ? "=" : b64chars.charAt(ord & 63)
          ];
          return chars.join("");
        }, "cb_encode");
        var btoa = global.btoa || function(b) {
          return b.replace(/[\s\S]{1,3}/g, cb_encode);
        };
        class Timer {
          static {
            __name(this, "Timer");
          }
          constructor(set, clear, delay, callback) {
            this.clear = clear;
            this.timer = set(() => {
              if (this.timer) {
                this.timer = callback(this.timer);
              }
            }, delay);
          }
          isRunning() {
            return this.timer !== null;
          }
          ensureAborted() {
            if (this.timer) {
              this.clear(this.timer);
              this.timer = null;
            }
          }
        }
        var abstract_timer = Timer;
        function timers_clearTimeout(timer) {
          global.clearTimeout(timer);
        }
        __name(timers_clearTimeout, "timers_clearTimeout");
        function timers_clearInterval(timer) {
          global.clearInterval(timer);
        }
        __name(timers_clearInterval, "timers_clearInterval");
        class timers_OneOffTimer extends abstract_timer {
          static {
            __name(this, "timers_OneOffTimer");
          }
          constructor(delay, callback) {
            super(setTimeout, timers_clearTimeout, delay, function(timer) {
              callback();
              return null;
            });
          }
        }
        class timers_PeriodicTimer extends abstract_timer {
          static {
            __name(this, "timers_PeriodicTimer");
          }
          constructor(delay, callback) {
            super(setInterval, timers_clearInterval, delay, function(timer) {
              callback();
              return timer;
            });
          }
        }
        var Util = {
          now() {
            if (Date.now) {
              return Date.now();
            } else {
              return (/* @__PURE__ */ new Date()).valueOf();
            }
          },
          defer(callback) {
            return new timers_OneOffTimer(0, callback);
          },
          method(name, ...args) {
            var boundArguments = Array.prototype.slice.call(arguments, 1);
            return function(object) {
              return object[name].apply(object, boundArguments.concat(arguments));
            };
          }
        };
        var util = Util;
        function extend(target, ...sources) {
          for (var i = 0; i < sources.length; i++) {
            var extensions = sources[i];
            for (var property in extensions) {
              if (extensions[property] && extensions[property].constructor && extensions[property].constructor === Object) {
                target[property] = extend(target[property] || {}, extensions[property]);
              } else {
                target[property] = extensions[property];
              }
            }
          }
          return target;
        }
        __name(extend, "extend");
        function stringify() {
          var m = ["Pusher"];
          for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] === "string") {
              m.push(arguments[i]);
            } else {
              m.push(safeJSONStringify(arguments[i]));
            }
          }
          return m.join(" : ");
        }
        __name(stringify, "stringify");
        function arrayIndexOf(array, item) {
          var nativeIndexOf = Array.prototype.indexOf;
          if (array === null) {
            return -1;
          }
          if (nativeIndexOf && array.indexOf === nativeIndexOf) {
            return array.indexOf(item);
          }
          for (var i = 0, l2 = array.length; i < l2; i++) {
            if (array[i] === item) {
              return i;
            }
          }
          return -1;
        }
        __name(arrayIndexOf, "arrayIndexOf");
        function objectApply(object, f) {
          for (var key in object) {
            if (Object.prototype.hasOwnProperty.call(object, key)) {
              f(object[key], key, object);
            }
          }
        }
        __name(objectApply, "objectApply");
        function keys(object) {
          var keys2 = [];
          objectApply(object, function(_, key) {
            keys2.push(key);
          });
          return keys2;
        }
        __name(keys, "keys");
        function values(object) {
          var values2 = [];
          objectApply(object, function(value) {
            values2.push(value);
          });
          return values2;
        }
        __name(values, "values");
        function apply(array, f, context) {
          for (var i = 0; i < array.length; i++) {
            f.call(context || global, array[i], i, array);
          }
        }
        __name(apply, "apply");
        function map(array, f) {
          var result = [];
          for (var i = 0; i < array.length; i++) {
            result.push(f(array[i], i, array, result));
          }
          return result;
        }
        __name(map, "map");
        function mapObject(object, f) {
          var result = {};
          objectApply(object, function(value, key) {
            result[key] = f(value);
          });
          return result;
        }
        __name(mapObject, "mapObject");
        function filter(array, test) {
          test = test || function(value) {
            return !!value;
          };
          var result = [];
          for (var i = 0; i < array.length; i++) {
            if (test(array[i], i, array, result)) {
              result.push(array[i]);
            }
          }
          return result;
        }
        __name(filter, "filter");
        function filterObject(object, test) {
          var result = {};
          objectApply(object, function(value, key) {
            if (test && test(value, key, object, result) || Boolean(value)) {
              result[key] = value;
            }
          });
          return result;
        }
        __name(filterObject, "filterObject");
        function flatten(object) {
          var result = [];
          objectApply(object, function(value, key) {
            result.push([key, value]);
          });
          return result;
        }
        __name(flatten, "flatten");
        function any(array, test) {
          for (var i = 0; i < array.length; i++) {
            if (test(array[i], i, array)) {
              return true;
            }
          }
          return false;
        }
        __name(any, "any");
        function collections_all(array, test) {
          for (var i = 0; i < array.length; i++) {
            if (!test(array[i], i, array)) {
              return false;
            }
          }
          return true;
        }
        __name(collections_all, "collections_all");
        function encodeParamsObject(data) {
          return mapObject(data, function(value) {
            if (typeof value === "object") {
              value = safeJSONStringify(value);
            }
            return encodeURIComponent(encode(value.toString()));
          });
        }
        __name(encodeParamsObject, "encodeParamsObject");
        function buildQueryString(data) {
          var params = filterObject(data, function(value) {
            return value !== void 0;
          });
          var query = map(flatten(encodeParamsObject(params)), util.method("join", "=")).join("&");
          return query;
        }
        __name(buildQueryString, "buildQueryString");
        function decycleObject(object) {
          var objects = [], paths = [];
          return (/* @__PURE__ */ __name(function derez(value, path) {
            var i, name, nu;
            switch (typeof value) {
              case "object":
                if (!value) {
                  return null;
                }
                for (i = 0; i < objects.length; i += 1) {
                  if (objects[i] === value) {
                    return { $ref: paths[i] };
                  }
                }
                objects.push(value);
                paths.push(path);
                if (Object.prototype.toString.apply(value) === "[object Array]") {
                  nu = [];
                  for (i = 0; i < value.length; i += 1) {
                    nu[i] = derez(value[i], path + "[" + i + "]");
                  }
                } else {
                  nu = {};
                  for (name in value) {
                    if (Object.prototype.hasOwnProperty.call(value, name)) {
                      nu[name] = derez(value[name], path + "[" + JSON.stringify(name) + "]");
                    }
                  }
                }
                return nu;
              case "number":
              case "string":
              case "boolean":
                return value;
            }
          }, "derez"))(object, "$");
        }
        __name(decycleObject, "decycleObject");
        function safeJSONStringify(source) {
          try {
            return JSON.stringify(source);
          } catch (e) {
            return JSON.stringify(decycleObject(source));
          }
        }
        __name(safeJSONStringify, "safeJSONStringify");
        var Defaults = {
          VERSION: "8.4.0",
          PROTOCOL: 7,
          wsPort: 80,
          wssPort: 443,
          wsPath: "",
          httpHost: "sockjs.pusher.com",
          httpPort: 80,
          httpsPort: 443,
          httpPath: "/pusher",
          stats_host: "stats.pusher.com",
          authEndpoint: "/pusher/auth",
          authTransport: "ajax",
          activityTimeout: 12e4,
          pongTimeout: 3e4,
          unavailableTimeout: 1e4,
          userAuthentication: {
            endpoint: "/pusher/user-auth",
            transport: "ajax"
          },
          channelAuthorization: {
            endpoint: "/pusher/auth",
            transport: "ajax"
          },
          cdn_http: "http://js.pusher.com",
          cdn_https: "https://js.pusher.com",
          dependency_suffix: ""
        };
        var defaults = Defaults;
        function getGenericURL(baseScheme, params, path) {
          var scheme = baseScheme + (params.useTLS ? "s" : "");
          var host = params.useTLS ? params.hostTLS : params.hostNonTLS;
          return scheme + "://" + host + path;
        }
        __name(getGenericURL, "getGenericURL");
        function getGenericPath(key, queryString) {
          var path = "/app/" + key;
          var query = "?protocol=" + defaults.PROTOCOL + "&client=js&version=" + defaults.VERSION + (queryString ? "&" + queryString : "");
          return path + query;
        }
        __name(getGenericPath, "getGenericPath");
        var ws = {
          getInitial: /* @__PURE__ */ __name(function(key, params) {
            var path = (params.httpPath || "") + getGenericPath(key, "flash=false");
            return getGenericURL("ws", params, path);
          }, "getInitial")
        };
        var http = {
          getInitial: /* @__PURE__ */ __name(function(key, params) {
            var path = (params.httpPath || "/pusher") + getGenericPath(key);
            return getGenericURL("http", params, path);
          }, "getInitial")
        };
        var sockjs = {
          getInitial: /* @__PURE__ */ __name(function(key, params) {
            return getGenericURL("http", params, params.httpPath || "/pusher");
          }, "getInitial"),
          getPath: /* @__PURE__ */ __name(function(key, params) {
            return getGenericPath(key);
          }, "getPath")
        };
        class callback_registry_CallbackRegistry {
          static {
            __name(this, "callback_registry_CallbackRegistry");
          }
          constructor() {
            this._callbacks = {};
          }
          get(name) {
            return this._callbacks[prefix(name)];
          }
          add(name, callback, context) {
            var prefixedEventName = prefix(name);
            this._callbacks[prefixedEventName] = this._callbacks[prefixedEventName] || [];
            this._callbacks[prefixedEventName].push({
              fn: callback,
              context
            });
          }
          remove(name, callback, context) {
            if (!name && !callback && !context) {
              this._callbacks = {};
              return;
            }
            var names = name ? [prefix(name)] : keys(this._callbacks);
            if (callback || context) {
              this.removeCallback(names, callback, context);
            } else {
              this.removeAllCallbacks(names);
            }
          }
          removeCallback(names, callback, context) {
            apply(names, function(name) {
              this._callbacks[name] = filter(this._callbacks[name] || [], function(binding) {
                return callback && callback !== binding.fn || context && context !== binding.context;
              });
              if (this._callbacks[name].length === 0) {
                delete this._callbacks[name];
              }
            }, this);
          }
          removeAllCallbacks(names) {
            apply(names, function(name) {
              delete this._callbacks[name];
            }, this);
          }
        }
        function prefix(name) {
          return "_" + name;
        }
        __name(prefix, "prefix");
        class dispatcher_Dispatcher {
          static {
            __name(this, "dispatcher_Dispatcher");
          }
          constructor(failThrough) {
            this.callbacks = new callback_registry_CallbackRegistry();
            this.global_callbacks = [];
            this.failThrough = failThrough;
          }
          bind(eventName, callback, context) {
            this.callbacks.add(eventName, callback, context);
            return this;
          }
          bind_global(callback) {
            this.global_callbacks.push(callback);
            return this;
          }
          unbind(eventName, callback, context) {
            this.callbacks.remove(eventName, callback, context);
            return this;
          }
          unbind_global(callback) {
            if (!callback) {
              this.global_callbacks = [];
              return this;
            }
            this.global_callbacks = filter(this.global_callbacks || [], (c) => c !== callback);
            return this;
          }
          unbind_all() {
            this.unbind();
            this.unbind_global();
            return this;
          }
          emit(eventName, data, metadata) {
            for (var i = 0; i < this.global_callbacks.length; i++) {
              this.global_callbacks[i](eventName, data);
            }
            var callbacks = this.callbacks.get(eventName);
            var args = [];
            if (metadata) {
              args.push(data, metadata);
            } else if (data) {
              args.push(data);
            }
            if (callbacks && callbacks.length > 0) {
              for (var i = 0; i < callbacks.length; i++) {
                callbacks[i].fn.apply(callbacks[i].context || global, args);
              }
            } else if (this.failThrough) {
              this.failThrough(eventName, data);
            }
            return this;
          }
        }
        class logger_Logger {
          static {
            __name(this, "logger_Logger");
          }
          constructor() {
            this.globalLog = (message) => {
              if (global.console && global.console.log) {
                global.console.log(message);
              }
            };
          }
          debug(...args) {
            this.log(this.globalLog, args);
          }
          warn(...args) {
            this.log(this.globalLogWarn, args);
          }
          error(...args) {
            this.log(this.globalLogError, args);
          }
          globalLogWarn(message) {
            if (global.console && global.console.warn) {
              global.console.warn(message);
            } else {
              this.globalLog(message);
            }
          }
          globalLogError(message) {
            if (global.console && global.console.error) {
              global.console.error(message);
            } else {
              this.globalLogWarn(message);
            }
          }
          log(defaultLoggingFunction, ...args) {
            var message = stringify.apply(this, arguments);
            if (core_pusher.log) {
              core_pusher.log(message);
            } else if (core_pusher.logToConsole) {
              const log = defaultLoggingFunction.bind(this);
              log(message);
            }
          }
        }
        var logger = new logger_Logger();
        class transport_connection_TransportConnection extends dispatcher_Dispatcher {
          static {
            __name(this, "transport_connection_TransportConnection");
          }
          constructor(hooks, name, priority, key, options) {
            super();
            this.initialize = node_runtime.transportConnectionInitializer;
            this.hooks = hooks;
            this.name = name;
            this.priority = priority;
            this.key = key;
            this.options = options;
            this.state = "new";
            this.timeline = options.timeline;
            this.activityTimeout = options.activityTimeout;
            this.id = this.timeline.generateUniqueID();
          }
          handlesActivityChecks() {
            return Boolean(this.hooks.handlesActivityChecks);
          }
          supportsPing() {
            return Boolean(this.hooks.supportsPing);
          }
          connect() {
            if (this.socket || this.state !== "initialized") {
              return false;
            }
            var url = this.hooks.urls.getInitial(this.key, this.options);
            try {
              this.socket = this.hooks.getSocket(url, this.options);
            } catch (e) {
              util.defer(() => {
                this.onError(e);
                this.changeState("closed");
              });
              return false;
            }
            this.bindListeners();
            logger.debug("Connecting", { transport: this.name, url });
            this.changeState("connecting");
            return true;
          }
          close() {
            if (this.socket) {
              this.socket.close();
              return true;
            } else {
              return false;
            }
          }
          send(data) {
            if (this.state === "open") {
              util.defer(() => {
                if (this.socket) {
                  this.socket.send(data);
                }
              });
              return true;
            } else {
              return false;
            }
          }
          ping() {
            if (this.state === "open" && this.supportsPing()) {
              this.socket.ping();
            }
          }
          onOpen() {
            if (this.hooks.beforeOpen) {
              this.hooks.beforeOpen(this.socket, this.hooks.urls.getPath(this.key, this.options));
            }
            this.changeState("open");
            this.socket.onopen = void 0;
          }
          onError(error) {
            this.emit("error", { type: "WebSocketError", error });
            this.timeline.error(this.buildTimelineMessage({ error: error.toString() }));
          }
          onClose(closeEvent) {
            if (closeEvent) {
              this.changeState("closed", {
                code: closeEvent.code,
                reason: closeEvent.reason,
                wasClean: closeEvent.wasClean
              });
            } else {
              this.changeState("closed");
            }
            this.unbindListeners();
            this.socket = void 0;
          }
          onMessage(message) {
            this.emit("message", message);
          }
          onActivity() {
            this.emit("activity");
          }
          bindListeners() {
            this.socket.onopen = () => {
              this.onOpen();
            };
            this.socket.onerror = (error) => {
              this.onError(error);
            };
            this.socket.onclose = (closeEvent) => {
              this.onClose(closeEvent);
            };
            this.socket.onmessage = (message) => {
              this.onMessage(message);
            };
            if (this.supportsPing()) {
              this.socket.onactivity = () => {
                this.onActivity();
              };
            }
          }
          unbindListeners() {
            if (this.socket) {
              this.socket.onopen = void 0;
              this.socket.onerror = void 0;
              this.socket.onclose = void 0;
              this.socket.onmessage = void 0;
              if (this.supportsPing()) {
                this.socket.onactivity = void 0;
              }
            }
          }
          changeState(state2, params) {
            this.state = state2;
            this.timeline.info(this.buildTimelineMessage({
              state: state2,
              params
            }));
            this.emit(state2, params);
          }
          buildTimelineMessage(message) {
            return extend({ cid: this.id }, message);
          }
        }
        class transport_Transport {
          static {
            __name(this, "transport_Transport");
          }
          constructor(hooks) {
            this.hooks = hooks;
          }
          isSupported(environment) {
            return this.hooks.isSupported(environment);
          }
          createConnection(name, priority, key, options) {
            return new transport_connection_TransportConnection(this.hooks, name, priority, key, options);
          }
        }
        var WSTransport = new transport_Transport({
          urls: ws,
          handlesActivityChecks: false,
          supportsPing: false,
          isInitialized: /* @__PURE__ */ __name(function() {
            return Boolean(node_runtime.getWebSocketAPI());
          }, "isInitialized"),
          isSupported: /* @__PURE__ */ __name(function() {
            return Boolean(node_runtime.getWebSocketAPI());
          }, "isSupported"),
          getSocket: /* @__PURE__ */ __name(function(url) {
            return node_runtime.createWebSocket(url);
          }, "getSocket")
        });
        var httpConfiguration = {
          urls: http,
          handlesActivityChecks: false,
          supportsPing: true,
          isInitialized: /* @__PURE__ */ __name(function() {
            return true;
          }, "isInitialized")
        };
        var streamingConfiguration = extend({
          getSocket: /* @__PURE__ */ __name(function(url) {
            return node_runtime.HTTPFactory.createStreamingSocket(url);
          }, "getSocket")
        }, httpConfiguration);
        var pollingConfiguration = extend({
          getSocket: /* @__PURE__ */ __name(function(url) {
            return node_runtime.HTTPFactory.createPollingSocket(url);
          }, "getSocket")
        }, httpConfiguration);
        var xhrConfiguration = {
          isSupported: /* @__PURE__ */ __name(function() {
            return node_runtime.isXHRSupported();
          }, "isSupported")
        };
        var XHRStreamingTransport = new transport_Transport(extend({}, streamingConfiguration, xhrConfiguration));
        var XHRPollingTransport = new transport_Transport(extend({}, pollingConfiguration, xhrConfiguration));
        var Transports = {
          ws: WSTransport,
          xhr_streaming: XHRStreamingTransport,
          xhr_polling: XHRPollingTransport
        };
        var transports = Transports;
        class assistant_to_the_transport_manager_AssistantToTheTransportManager {
          static {
            __name(this, "assistant_to_the_transport_manager_AssistantToTheTransportManager");
          }
          constructor(manager, transport, options) {
            this.manager = manager;
            this.transport = transport;
            this.minPingDelay = options.minPingDelay;
            this.maxPingDelay = options.maxPingDelay;
            this.pingDelay = void 0;
          }
          createConnection(name, priority, key, options) {
            options = extend({}, options, {
              activityTimeout: this.pingDelay
            });
            var connection = this.transport.createConnection(name, priority, key, options);
            var openTimestamp = null;
            var onOpen = /* @__PURE__ */ __name(function() {
              connection.unbind("open", onOpen);
              connection.bind("closed", onClosed);
              openTimestamp = util.now();
            }, "onOpen");
            var onClosed = /* @__PURE__ */ __name((closeEvent) => {
              connection.unbind("closed", onClosed);
              if (closeEvent.code === 1002 || closeEvent.code === 1003) {
                this.manager.reportDeath();
              } else if (!closeEvent.wasClean && openTimestamp) {
                var lifespan = util.now() - openTimestamp;
                if (lifespan < 2 * this.maxPingDelay) {
                  this.manager.reportDeath();
                  this.pingDelay = Math.max(lifespan / 2, this.minPingDelay);
                }
              }
            }, "onClosed");
            connection.bind("open", onOpen);
            return connection;
          }
          isSupported(environment) {
            return this.manager.isAlive() && this.transport.isSupported(environment);
          }
        }
        const Protocol = {
          decodeMessage: /* @__PURE__ */ __name(function(messageEvent) {
            try {
              var messageData = JSON.parse(messageEvent.data);
              var pusherEventData = messageData.data;
              if (typeof pusherEventData === "string") {
                try {
                  pusherEventData = JSON.parse(messageData.data);
                } catch (e) {
                }
              }
              var pusherEvent = {
                event: messageData.event,
                channel: messageData.channel,
                data: pusherEventData
              };
              if (messageData.user_id) {
                pusherEvent.user_id = messageData.user_id;
              }
              return pusherEvent;
            } catch (e) {
              throw { type: "MessageParseError", error: e, data: messageEvent.data };
            }
          }, "decodeMessage"),
          encodeMessage: /* @__PURE__ */ __name(function(event) {
            return JSON.stringify(event);
          }, "encodeMessage"),
          processHandshake: /* @__PURE__ */ __name(function(messageEvent) {
            var message = Protocol.decodeMessage(messageEvent);
            if (message.event === "pusher:connection_established") {
              if (!message.data.activity_timeout) {
                throw "No activity timeout specified in handshake";
              }
              return {
                action: "connected",
                id: message.data.socket_id,
                activityTimeout: message.data.activity_timeout * 1e3
              };
            } else if (message.event === "pusher:error") {
              return {
                action: this.getCloseAction(message.data),
                error: this.getCloseError(message.data)
              };
            } else {
              throw "Invalid handshake";
            }
          }, "processHandshake"),
          getCloseAction: /* @__PURE__ */ __name(function(closeEvent) {
            if (closeEvent.code < 4e3) {
              if (closeEvent.code >= 1002 && closeEvent.code <= 1004) {
                return "backoff";
              } else {
                return null;
              }
            } else if (closeEvent.code === 4e3) {
              return "tls_only";
            } else if (closeEvent.code < 4100) {
              return "refused";
            } else if (closeEvent.code < 4200) {
              return "backoff";
            } else if (closeEvent.code < 4300) {
              return "retry";
            } else {
              return "refused";
            }
          }, "getCloseAction"),
          getCloseError: /* @__PURE__ */ __name(function(closeEvent) {
            if (closeEvent.code !== 1e3 && closeEvent.code !== 1001) {
              return {
                type: "PusherError",
                data: {
                  code: closeEvent.code,
                  message: closeEvent.reason || closeEvent.message
                }
              };
            } else {
              return null;
            }
          }, "getCloseError")
        };
        var protocol = Protocol;
        class connection_Connection extends dispatcher_Dispatcher {
          static {
            __name(this, "connection_Connection");
          }
          constructor(id, transport) {
            super();
            this.id = id;
            this.transport = transport;
            this.activityTimeout = transport.activityTimeout;
            this.bindListeners();
          }
          handlesActivityChecks() {
            return this.transport.handlesActivityChecks();
          }
          send(data) {
            return this.transport.send(data);
          }
          send_event(name, data, channel) {
            var event = { event: name, data };
            if (channel) {
              event.channel = channel;
            }
            logger.debug("Event sent", event);
            return this.send(protocol.encodeMessage(event));
          }
          ping() {
            if (this.transport.supportsPing()) {
              this.transport.ping();
            } else {
              this.send_event("pusher:ping", {});
            }
          }
          close() {
            this.transport.close();
          }
          bindListeners() {
            var listeners = {
              message: /* @__PURE__ */ __name((messageEvent) => {
                var pusherEvent;
                try {
                  pusherEvent = protocol.decodeMessage(messageEvent);
                } catch (e) {
                  this.emit("error", {
                    type: "MessageParseError",
                    error: e,
                    data: messageEvent.data
                  });
                }
                if (pusherEvent !== void 0) {
                  logger.debug("Event recd", pusherEvent);
                  switch (pusherEvent.event) {
                    case "pusher:error":
                      this.emit("error", {
                        type: "PusherError",
                        data: pusherEvent.data
                      });
                      break;
                    case "pusher:ping":
                      this.emit("ping");
                      break;
                    case "pusher:pong":
                      this.emit("pong");
                      break;
                  }
                  this.emit("message", pusherEvent);
                }
              }, "message"),
              activity: /* @__PURE__ */ __name(() => {
                this.emit("activity");
              }, "activity"),
              error: /* @__PURE__ */ __name((error) => {
                this.emit("error", error);
              }, "error"),
              closed: /* @__PURE__ */ __name((closeEvent) => {
                unbindListeners();
                if (closeEvent && closeEvent.code) {
                  this.handleCloseEvent(closeEvent);
                }
                this.transport = null;
                this.emit("closed");
              }, "closed")
            };
            var unbindListeners = /* @__PURE__ */ __name(() => {
              objectApply(listeners, (listener, event) => {
                this.transport.unbind(event, listener);
              });
            }, "unbindListeners");
            objectApply(listeners, (listener, event) => {
              this.transport.bind(event, listener);
            });
          }
          handleCloseEvent(closeEvent) {
            var action = protocol.getCloseAction(closeEvent);
            var error = protocol.getCloseError(closeEvent);
            if (error) {
              this.emit("error", error);
            }
            if (action) {
              this.emit(action, { action, error });
            }
          }
        }
        class handshake_Handshake {
          static {
            __name(this, "handshake_Handshake");
          }
          constructor(transport, callback) {
            this.transport = transport;
            this.callback = callback;
            this.bindListeners();
          }
          close() {
            this.unbindListeners();
            this.transport.close();
          }
          bindListeners() {
            this.onMessage = (m) => {
              this.unbindListeners();
              var result;
              try {
                result = protocol.processHandshake(m);
              } catch (e) {
                this.finish("error", { error: e });
                this.transport.close();
                return;
              }
              if (result.action === "connected") {
                this.finish("connected", {
                  connection: new connection_Connection(result.id, this.transport),
                  activityTimeout: result.activityTimeout
                });
              } else {
                this.finish(result.action, { error: result.error });
                this.transport.close();
              }
            };
            this.onClosed = (closeEvent) => {
              this.unbindListeners();
              var action = protocol.getCloseAction(closeEvent) || "backoff";
              var error = protocol.getCloseError(closeEvent);
              this.finish(action, { error });
            };
            this.transport.bind("message", this.onMessage);
            this.transport.bind("closed", this.onClosed);
          }
          unbindListeners() {
            this.transport.unbind("message", this.onMessage);
            this.transport.unbind("closed", this.onClosed);
          }
          finish(action, params) {
            this.callback(extend({ transport: this.transport, action }, params));
          }
        }
        class timeline_sender_TimelineSender {
          static {
            __name(this, "timeline_sender_TimelineSender");
          }
          constructor(timeline, options) {
            this.timeline = timeline;
            this.options = options || {};
          }
          send(useTLS, callback) {
            if (this.timeline.isEmpty()) {
              return;
            }
            this.timeline.send(node_runtime.TimelineTransport.getAgent(this, useTLS), callback);
          }
        }
        class BadEventName extends Error {
          static {
            __name(this, "BadEventName");
          }
          constructor(msg) {
            super(msg);
            Object.setPrototypeOf(this, new.target.prototype);
          }
        }
        class BadChannelName extends Error {
          static {
            __name(this, "BadChannelName");
          }
          constructor(msg) {
            super(msg);
            Object.setPrototypeOf(this, new.target.prototype);
          }
        }
        class RequestTimedOut extends Error {
          static {
            __name(this, "RequestTimedOut");
          }
          constructor(msg) {
            super(msg);
            Object.setPrototypeOf(this, new.target.prototype);
          }
        }
        class TransportPriorityTooLow extends Error {
          static {
            __name(this, "TransportPriorityTooLow");
          }
          constructor(msg) {
            super(msg);
            Object.setPrototypeOf(this, new.target.prototype);
          }
        }
        class TransportClosed extends Error {
          static {
            __name(this, "TransportClosed");
          }
          constructor(msg) {
            super(msg);
            Object.setPrototypeOf(this, new.target.prototype);
          }
        }
        class UnsupportedFeature extends Error {
          static {
            __name(this, "UnsupportedFeature");
          }
          constructor(msg) {
            super(msg);
            Object.setPrototypeOf(this, new.target.prototype);
          }
        }
        class UnsupportedTransport extends Error {
          static {
            __name(this, "UnsupportedTransport");
          }
          constructor(msg) {
            super(msg);
            Object.setPrototypeOf(this, new.target.prototype);
          }
        }
        class UnsupportedStrategy extends Error {
          static {
            __name(this, "UnsupportedStrategy");
          }
          constructor(msg) {
            super(msg);
            Object.setPrototypeOf(this, new.target.prototype);
          }
        }
        class HTTPAuthError extends Error {
          static {
            __name(this, "HTTPAuthError");
          }
          constructor(status, msg) {
            super(msg);
            this.status = status;
            Object.setPrototypeOf(this, new.target.prototype);
          }
        }
        const urlStore = {
          baseUrl: "https://pusher.com",
          urls: {
            authenticationEndpoint: {
              path: "/docs/channels/server_api/authenticating_users"
            },
            authorizationEndpoint: {
              path: "/docs/channels/server_api/authorizing-users/"
            },
            javascriptQuickStart: {
              path: "/docs/javascript_quick_start"
            },
            triggeringClientEvents: {
              path: "/docs/client_api_guide/client_events#trigger-events"
            },
            encryptedChannelSupport: {
              fullUrl: "https://github.com/pusher/pusher-js/tree/cc491015371a4bde5743d1c87a0fbac0feb53195#encrypted-channel-support"
            }
          }
        };
        const buildLogSuffix = /* @__PURE__ */ __name(function(key) {
          const urlPrefix = "See:";
          const urlObj = urlStore.urls[key];
          if (!urlObj)
            return "";
          let url;
          if (urlObj.fullUrl) {
            url = urlObj.fullUrl;
          } else if (urlObj.path) {
            url = urlStore.baseUrl + urlObj.path;
          }
          if (!url)
            return "";
          return `${urlPrefix} ${url}`;
        }, "buildLogSuffix");
        var url_store = { buildLogSuffix };
        class channel_Channel extends dispatcher_Dispatcher {
          static {
            __name(this, "channel_Channel");
          }
          constructor(name, pusher) {
            super(function(event, data) {
              logger.debug("No callbacks on " + name + " for " + event);
            });
            this.name = name;
            this.pusher = pusher;
            this.subscribed = false;
            this.subscriptionPending = false;
            this.subscriptionCancelled = false;
          }
          authorize(socketId, callback) {
            return callback(null, { auth: "" });
          }
          trigger(event, data) {
            if (event.indexOf("client-") !== 0) {
              throw new BadEventName("Event '" + event + "' does not start with 'client-'");
            }
            if (!this.subscribed) {
              var suffix = url_store.buildLogSuffix("triggeringClientEvents");
              logger.warn(`Client event triggered before channel 'subscription_succeeded' event . ${suffix}`);
            }
            return this.pusher.send_event(event, data, this.name);
          }
          disconnect() {
            this.subscribed = false;
            this.subscriptionPending = false;
          }
          handleEvent(event) {
            var eventName = event.event;
            var data = event.data;
            if (eventName === "pusher_internal:subscription_succeeded") {
              this.handleSubscriptionSucceededEvent(event);
            } else if (eventName === "pusher_internal:subscription_count") {
              this.handleSubscriptionCountEvent(event);
            } else if (eventName.indexOf("pusher_internal:") !== 0) {
              var metadata = {};
              this.emit(eventName, data, metadata);
            }
          }
          handleSubscriptionSucceededEvent(event) {
            this.subscriptionPending = false;
            this.subscribed = true;
            if (this.subscriptionCancelled) {
              this.pusher.unsubscribe(this.name);
            } else {
              this.emit("pusher:subscription_succeeded", event.data);
            }
          }
          handleSubscriptionCountEvent(event) {
            if (event.data.subscription_count) {
              this.subscriptionCount = event.data.subscription_count;
            }
            this.emit("pusher:subscription_count", event.data);
          }
          subscribe() {
            if (this.subscribed) {
              return;
            }
            this.subscriptionPending = true;
            this.subscriptionCancelled = false;
            this.authorize(this.pusher.connection.socket_id, (error, data) => {
              if (error) {
                this.subscriptionPending = false;
                logger.error(error.toString());
                this.emit("pusher:subscription_error", Object.assign({}, {
                  type: "AuthError",
                  error: error.message
                }, error instanceof HTTPAuthError ? { status: error.status } : {}));
              } else {
                this.pusher.send_event("pusher:subscribe", {
                  auth: data.auth,
                  channel_data: data.channel_data,
                  channel: this.name
                });
              }
            });
          }
          unsubscribe() {
            this.subscribed = false;
            this.pusher.send_event("pusher:unsubscribe", {
              channel: this.name
            });
          }
          cancelSubscription() {
            this.subscriptionCancelled = true;
          }
          reinstateSubscription() {
            this.subscriptionCancelled = false;
          }
        }
        class private_channel_PrivateChannel extends channel_Channel {
          static {
            __name(this, "private_channel_PrivateChannel");
          }
          authorize(socketId, callback) {
            return this.pusher.config.channelAuthorizer({
              channelName: this.name,
              socketId
            }, callback);
          }
        }
        class members_Members {
          static {
            __name(this, "members_Members");
          }
          constructor() {
            this.reset();
          }
          get(id) {
            if (Object.prototype.hasOwnProperty.call(this.members, id)) {
              return {
                id,
                info: this.members[id]
              };
            } else {
              return null;
            }
          }
          each(callback) {
            objectApply(this.members, (member, id) => {
              callback(this.get(id));
            });
          }
          setMyID(id) {
            this.myID = id;
          }
          onSubscription(subscriptionData) {
            this.members = subscriptionData.presence.hash;
            this.count = subscriptionData.presence.count;
            this.me = this.get(this.myID);
          }
          addMember(memberData) {
            if (this.get(memberData.user_id) === null) {
              this.count++;
            }
            this.members[memberData.user_id] = memberData.user_info;
            return this.get(memberData.user_id);
          }
          removeMember(memberData) {
            var member = this.get(memberData.user_id);
            if (member) {
              delete this.members[memberData.user_id];
              this.count--;
            }
            return member;
          }
          reset() {
            this.members = {};
            this.count = 0;
            this.myID = null;
            this.me = null;
          }
        }
        var __awaiter = function(thisArg, _arguments, P, generator) {
          function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
              resolve(value);
            });
          }
          __name(adopt, "adopt");
          return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
              try {
                step(generator.next(value));
              } catch (e) {
                reject(e);
              }
            }
            __name(fulfilled, "fulfilled");
            function rejected(value) {
              try {
                step(generator["throw"](value));
              } catch (e) {
                reject(e);
              }
            }
            __name(rejected, "rejected");
            function step(result) {
              result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            __name(step, "step");
            step((generator = generator.apply(thisArg, _arguments || [])).next());
          });
        };
        class presence_channel_PresenceChannel extends private_channel_PrivateChannel {
          static {
            __name(this, "presence_channel_PresenceChannel");
          }
          constructor(name, pusher) {
            super(name, pusher);
            this.members = new members_Members();
          }
          authorize(socketId, callback) {
            super.authorize(socketId, (error, authData) => __awaiter(this, void 0, void 0, function* () {
              if (!error) {
                authData = authData;
                if (authData.channel_data != null) {
                  var channelData = JSON.parse(authData.channel_data);
                  this.members.setMyID(channelData.user_id);
                } else {
                  yield this.pusher.user.signinDonePromise;
                  if (this.pusher.user.user_data != null) {
                    this.members.setMyID(this.pusher.user.user_data.id);
                  } else {
                    let suffix = url_store.buildLogSuffix("authorizationEndpoint");
                    logger.error(`Invalid auth response for channel '${this.name}', expected 'channel_data' field. ${suffix}, or the user should be signed in.`);
                    callback("Invalid auth response");
                    return;
                  }
                }
              }
              callback(error, authData);
            }));
          }
          handleEvent(event) {
            var eventName = event.event;
            if (eventName.indexOf("pusher_internal:") === 0) {
              this.handleInternalEvent(event);
            } else {
              var data = event.data;
              var metadata = {};
              if (event.user_id) {
                metadata.user_id = event.user_id;
              }
              this.emit(eventName, data, metadata);
            }
          }
          handleInternalEvent(event) {
            var eventName = event.event;
            var data = event.data;
            switch (eventName) {
              case "pusher_internal:subscription_succeeded":
                this.handleSubscriptionSucceededEvent(event);
                break;
              case "pusher_internal:subscription_count":
                this.handleSubscriptionCountEvent(event);
                break;
              case "pusher_internal:member_added":
                var addedMember = this.members.addMember(data);
                this.emit("pusher:member_added", addedMember);
                break;
              case "pusher_internal:member_removed":
                var removedMember = this.members.removeMember(data);
                if (removedMember) {
                  this.emit("pusher:member_removed", removedMember);
                }
                break;
            }
          }
          handleSubscriptionSucceededEvent(event) {
            this.subscriptionPending = false;
            this.subscribed = true;
            if (this.subscriptionCancelled) {
              this.pusher.unsubscribe(this.name);
            } else {
              this.members.onSubscription(event.data);
              this.emit("pusher:subscription_succeeded", this.members);
            }
          }
          disconnect() {
            this.members.reset();
            super.disconnect();
          }
        }
        var utf8 = __webpack_require__(17);
        var base64 = __webpack_require__(8);
        class encrypted_channel_EncryptedChannel extends private_channel_PrivateChannel {
          static {
            __name(this, "encrypted_channel_EncryptedChannel");
          }
          constructor(name, pusher, nacl) {
            super(name, pusher);
            this.key = null;
            this.nacl = nacl;
          }
          authorize(socketId, callback) {
            super.authorize(socketId, (error, authData) => {
              if (error) {
                callback(error, authData);
                return;
              }
              let sharedSecret = authData["shared_secret"];
              if (!sharedSecret) {
                callback(new Error(`No shared_secret key in auth payload for encrypted channel: ${this.name}`), null);
                return;
              }
              this.key = Object(base64["decode"])(sharedSecret);
              delete authData["shared_secret"];
              callback(null, authData);
            });
          }
          trigger(event, data) {
            throw new UnsupportedFeature("Client events are not currently supported for encrypted channels");
          }
          handleEvent(event) {
            var eventName = event.event;
            var data = event.data;
            if (eventName.indexOf("pusher_internal:") === 0 || eventName.indexOf("pusher:") === 0) {
              super.handleEvent(event);
              return;
            }
            this.handleEncryptedEvent(eventName, data);
          }
          handleEncryptedEvent(event, data) {
            if (!this.key) {
              logger.debug("Received encrypted event before key has been retrieved from the authEndpoint");
              return;
            }
            if (!data.ciphertext || !data.nonce) {
              logger.error("Unexpected format for encrypted event, expected object with `ciphertext` and `nonce` fields, got: " + data);
              return;
            }
            let cipherText = Object(base64["decode"])(data.ciphertext);
            if (cipherText.length < this.nacl.secretbox.overheadLength) {
              logger.error(`Expected encrypted event ciphertext length to be ${this.nacl.secretbox.overheadLength}, got: ${cipherText.length}`);
              return;
            }
            let nonce = Object(base64["decode"])(data.nonce);
            if (nonce.length < this.nacl.secretbox.nonceLength) {
              logger.error(`Expected encrypted event nonce length to be ${this.nacl.secretbox.nonceLength}, got: ${nonce.length}`);
              return;
            }
            let bytes = this.nacl.secretbox.open(cipherText, nonce, this.key);
            if (bytes === null) {
              logger.debug("Failed to decrypt an event, probably because it was encrypted with a different key. Fetching a new key from the authEndpoint...");
              this.authorize(this.pusher.connection.socket_id, (error, authData) => {
                if (error) {
                  logger.error(`Failed to make a request to the authEndpoint: ${authData}. Unable to fetch new key, so dropping encrypted event`);
                  return;
                }
                bytes = this.nacl.secretbox.open(cipherText, nonce, this.key);
                if (bytes === null) {
                  logger.error(`Failed to decrypt event with new key. Dropping encrypted event`);
                  return;
                }
                this.emit(event, this.getDataToEmit(bytes));
                return;
              });
              return;
            }
            this.emit(event, this.getDataToEmit(bytes));
          }
          getDataToEmit(bytes) {
            let raw = Object(utf8["decode"])(bytes);
            try {
              return JSON.parse(raw);
            } catch (_a) {
              return raw;
            }
          }
        }
        class connection_manager_ConnectionManager extends dispatcher_Dispatcher {
          static {
            __name(this, "connection_manager_ConnectionManager");
          }
          constructor(key, options) {
            super();
            this.state = "initialized";
            this.connection = null;
            this.key = key;
            this.options = options;
            this.timeline = this.options.timeline;
            this.usingTLS = this.options.useTLS;
            this.errorCallbacks = this.buildErrorCallbacks();
            this.connectionCallbacks = this.buildConnectionCallbacks(this.errorCallbacks);
            this.handshakeCallbacks = this.buildHandshakeCallbacks(this.errorCallbacks);
            var Network = node_runtime.getNetwork();
            Network.bind("online", () => {
              this.timeline.info({ netinfo: "online" });
              if (this.state === "connecting" || this.state === "unavailable") {
                this.retryIn(0);
              }
            });
            Network.bind("offline", () => {
              this.timeline.info({ netinfo: "offline" });
              if (this.connection) {
                this.sendActivityCheck();
              }
            });
            this.updateStrategy();
          }
          connect() {
            if (this.connection || this.runner) {
              return;
            }
            if (!this.strategy.isSupported()) {
              this.updateState("failed");
              return;
            }
            this.updateState("connecting");
            this.startConnecting();
            this.setUnavailableTimer();
          }
          send(data) {
            if (this.connection) {
              return this.connection.send(data);
            } else {
              return false;
            }
          }
          send_event(name, data, channel) {
            if (this.connection) {
              return this.connection.send_event(name, data, channel);
            } else {
              return false;
            }
          }
          disconnect() {
            this.disconnectInternally();
            this.updateState("disconnected");
          }
          isUsingTLS() {
            return this.usingTLS;
          }
          startConnecting() {
            var callback = /* @__PURE__ */ __name((error, handshake) => {
              if (error) {
                this.runner = this.strategy.connect(0, callback);
              } else {
                if (handshake.action === "error") {
                  this.emit("error", {
                    type: "HandshakeError",
                    error: handshake.error
                  });
                  this.timeline.error({ handshakeError: handshake.error });
                } else {
                  this.abortConnecting();
                  this.handshakeCallbacks[handshake.action](handshake);
                }
              }
            }, "callback");
            this.runner = this.strategy.connect(0, callback);
          }
          abortConnecting() {
            if (this.runner) {
              this.runner.abort();
              this.runner = null;
            }
          }
          disconnectInternally() {
            this.abortConnecting();
            this.clearRetryTimer();
            this.clearUnavailableTimer();
            if (this.connection) {
              var connection = this.abandonConnection();
              connection.close();
            }
          }
          updateStrategy() {
            this.strategy = this.options.getStrategy({
              key: this.key,
              timeline: this.timeline,
              useTLS: this.usingTLS
            });
          }
          retryIn(delay) {
            this.timeline.info({ action: "retry", delay });
            if (delay > 0) {
              this.emit("connecting_in", Math.round(delay / 1e3));
            }
            this.retryTimer = new timers_OneOffTimer(delay || 0, () => {
              this.disconnectInternally();
              this.connect();
            });
          }
          clearRetryTimer() {
            if (this.retryTimer) {
              this.retryTimer.ensureAborted();
              this.retryTimer = null;
            }
          }
          setUnavailableTimer() {
            this.unavailableTimer = new timers_OneOffTimer(this.options.unavailableTimeout, () => {
              this.updateState("unavailable");
            });
          }
          clearUnavailableTimer() {
            if (this.unavailableTimer) {
              this.unavailableTimer.ensureAborted();
            }
          }
          sendActivityCheck() {
            this.stopActivityCheck();
            this.connection.ping();
            this.activityTimer = new timers_OneOffTimer(this.options.pongTimeout, () => {
              this.timeline.error({ pong_timed_out: this.options.pongTimeout });
              this.retryIn(0);
            });
          }
          resetActivityCheck() {
            this.stopActivityCheck();
            if (this.connection && !this.connection.handlesActivityChecks()) {
              this.activityTimer = new timers_OneOffTimer(this.activityTimeout, () => {
                this.sendActivityCheck();
              });
            }
          }
          stopActivityCheck() {
            if (this.activityTimer) {
              this.activityTimer.ensureAborted();
            }
          }
          buildConnectionCallbacks(errorCallbacks) {
            return extend({}, errorCallbacks, {
              message: /* @__PURE__ */ __name((message) => {
                this.resetActivityCheck();
                this.emit("message", message);
              }, "message"),
              ping: /* @__PURE__ */ __name(() => {
                this.send_event("pusher:pong", {});
              }, "ping"),
              activity: /* @__PURE__ */ __name(() => {
                this.resetActivityCheck();
              }, "activity"),
              error: /* @__PURE__ */ __name((error) => {
                this.emit("error", error);
              }, "error"),
              closed: /* @__PURE__ */ __name(() => {
                this.abandonConnection();
                if (this.shouldRetry()) {
                  this.retryIn(1e3);
                }
              }, "closed")
            });
          }
          buildHandshakeCallbacks(errorCallbacks) {
            return extend({}, errorCallbacks, {
              connected: /* @__PURE__ */ __name((handshake) => {
                this.activityTimeout = Math.min(this.options.activityTimeout, handshake.activityTimeout, handshake.connection.activityTimeout || Infinity);
                this.clearUnavailableTimer();
                this.setConnection(handshake.connection);
                this.socket_id = this.connection.id;
                this.updateState("connected", { socket_id: this.socket_id });
              }, "connected")
            });
          }
          buildErrorCallbacks() {
            let withErrorEmitted = /* @__PURE__ */ __name((callback) => {
              return (result) => {
                if (result.error) {
                  this.emit("error", { type: "WebSocketError", error: result.error });
                }
                callback(result);
              };
            }, "withErrorEmitted");
            return {
              tls_only: withErrorEmitted(() => {
                this.usingTLS = true;
                this.updateStrategy();
                this.retryIn(0);
              }),
              refused: withErrorEmitted(() => {
                this.disconnect();
              }),
              backoff: withErrorEmitted(() => {
                this.retryIn(1e3);
              }),
              retry: withErrorEmitted(() => {
                this.retryIn(0);
              })
            };
          }
          setConnection(connection) {
            this.connection = connection;
            for (var event in this.connectionCallbacks) {
              this.connection.bind(event, this.connectionCallbacks[event]);
            }
            this.resetActivityCheck();
          }
          abandonConnection() {
            if (!this.connection) {
              return;
            }
            this.stopActivityCheck();
            for (var event in this.connectionCallbacks) {
              this.connection.unbind(event, this.connectionCallbacks[event]);
            }
            var connection = this.connection;
            this.connection = null;
            return connection;
          }
          updateState(newState, data) {
            var previousState = this.state;
            this.state = newState;
            if (previousState !== newState) {
              var newStateDescription = newState;
              if (newStateDescription === "connected") {
                newStateDescription += " with new socket ID " + data.socket_id;
              }
              logger.debug("State changed", previousState + " -> " + newStateDescription);
              this.timeline.info({ state: newState, params: data });
              this.emit("state_change", { previous: previousState, current: newState });
              this.emit(newState, data);
            }
          }
          shouldRetry() {
            return this.state === "connecting" || this.state === "connected";
          }
        }
        class channels_Channels {
          static {
            __name(this, "channels_Channels");
          }
          constructor() {
            this.channels = {};
          }
          add(name, pusher) {
            if (!this.channels[name]) {
              this.channels[name] = createChannel(name, pusher);
            }
            return this.channels[name];
          }
          all() {
            return values(this.channels);
          }
          find(name) {
            return this.channels[name];
          }
          remove(name) {
            var channel = this.channels[name];
            delete this.channels[name];
            return channel;
          }
          disconnect() {
            objectApply(this.channels, function(channel) {
              channel.disconnect();
            });
          }
        }
        function createChannel(name, pusher) {
          if (name.indexOf("private-encrypted-") === 0) {
            if (pusher.config.nacl) {
              return factory.createEncryptedChannel(name, pusher, pusher.config.nacl);
            }
            let errMsg = "Tried to subscribe to a private-encrypted- channel but no nacl implementation available";
            let suffix = url_store.buildLogSuffix("encryptedChannelSupport");
            throw new UnsupportedFeature(`${errMsg}. ${suffix}`);
          } else if (name.indexOf("private-") === 0) {
            return factory.createPrivateChannel(name, pusher);
          } else if (name.indexOf("presence-") === 0) {
            return factory.createPresenceChannel(name, pusher);
          } else if (name.indexOf("#") === 0) {
            throw new BadChannelName('Cannot create a channel with name "' + name + '".');
          } else {
            return factory.createChannel(name, pusher);
          }
        }
        __name(createChannel, "createChannel");
        var Factory = {
          createChannels() {
            return new channels_Channels();
          },
          createConnectionManager(key, options) {
            return new connection_manager_ConnectionManager(key, options);
          },
          createChannel(name, pusher) {
            return new channel_Channel(name, pusher);
          },
          createPrivateChannel(name, pusher) {
            return new private_channel_PrivateChannel(name, pusher);
          },
          createPresenceChannel(name, pusher) {
            return new presence_channel_PresenceChannel(name, pusher);
          },
          createEncryptedChannel(name, pusher, nacl) {
            return new encrypted_channel_EncryptedChannel(name, pusher, nacl);
          },
          createTimelineSender(timeline, options) {
            return new timeline_sender_TimelineSender(timeline, options);
          },
          createHandshake(transport, callback) {
            return new handshake_Handshake(transport, callback);
          },
          createAssistantToTheTransportManager(manager, transport, options) {
            return new assistant_to_the_transport_manager_AssistantToTheTransportManager(manager, transport, options);
          }
        };
        var factory = Factory;
        class transport_manager_TransportManager {
          static {
            __name(this, "transport_manager_TransportManager");
          }
          constructor(options) {
            this.options = options || {};
            this.livesLeft = this.options.lives || Infinity;
          }
          getAssistant(transport) {
            return factory.createAssistantToTheTransportManager(this, transport, {
              minPingDelay: this.options.minPingDelay,
              maxPingDelay: this.options.maxPingDelay
            });
          }
          isAlive() {
            return this.livesLeft > 0;
          }
          reportDeath() {
            this.livesLeft -= 1;
          }
        }
        class sequential_strategy_SequentialStrategy {
          static {
            __name(this, "sequential_strategy_SequentialStrategy");
          }
          constructor(strategies, options) {
            this.strategies = strategies;
            this.loop = Boolean(options.loop);
            this.failFast = Boolean(options.failFast);
            this.timeout = options.timeout;
            this.timeoutLimit = options.timeoutLimit;
          }
          isSupported() {
            return any(this.strategies, util.method("isSupported"));
          }
          connect(minPriority, callback) {
            var strategies = this.strategies;
            var current = 0;
            var timeout = this.timeout;
            var runner = null;
            var tryNextStrategy = /* @__PURE__ */ __name((error, handshake) => {
              if (handshake) {
                callback(null, handshake);
              } else {
                current = current + 1;
                if (this.loop) {
                  current = current % strategies.length;
                }
                if (current < strategies.length) {
                  if (timeout) {
                    timeout = timeout * 2;
                    if (this.timeoutLimit) {
                      timeout = Math.min(timeout, this.timeoutLimit);
                    }
                  }
                  runner = this.tryStrategy(strategies[current], minPriority, { timeout, failFast: this.failFast }, tryNextStrategy);
                } else {
                  callback(true);
                }
              }
            }, "tryNextStrategy");
            runner = this.tryStrategy(strategies[current], minPriority, { timeout, failFast: this.failFast }, tryNextStrategy);
            return {
              abort: /* @__PURE__ */ __name(function() {
                runner.abort();
              }, "abort"),
              forceMinPriority: /* @__PURE__ */ __name(function(p) {
                minPriority = p;
                if (runner) {
                  runner.forceMinPriority(p);
                }
              }, "forceMinPriority")
            };
          }
          tryStrategy(strategy, minPriority, options, callback) {
            var timer = null;
            var runner = null;
            if (options.timeout > 0) {
              timer = new timers_OneOffTimer(options.timeout, function() {
                runner.abort();
                callback(true);
              });
            }
            runner = strategy.connect(minPriority, function(error, handshake) {
              if (error && timer && timer.isRunning() && !options.failFast) {
                return;
              }
              if (timer) {
                timer.ensureAborted();
              }
              callback(error, handshake);
            });
            return {
              abort: /* @__PURE__ */ __name(function() {
                if (timer) {
                  timer.ensureAborted();
                }
                runner.abort();
              }, "abort"),
              forceMinPriority: /* @__PURE__ */ __name(function(p) {
                runner.forceMinPriority(p);
              }, "forceMinPriority")
            };
          }
        }
        class best_connected_ever_strategy_BestConnectedEverStrategy {
          static {
            __name(this, "best_connected_ever_strategy_BestConnectedEverStrategy");
          }
          constructor(strategies) {
            this.strategies = strategies;
          }
          isSupported() {
            return any(this.strategies, util.method("isSupported"));
          }
          connect(minPriority, callback) {
            return connect(this.strategies, minPriority, function(i, runners) {
              return function(error, handshake) {
                runners[i].error = error;
                if (error) {
                  if (allRunnersFailed(runners)) {
                    callback(true);
                  }
                  return;
                }
                apply(runners, function(runner) {
                  runner.forceMinPriority(handshake.transport.priority);
                });
                callback(null, handshake);
              };
            });
          }
        }
        function connect(strategies, minPriority, callbackBuilder) {
          var runners = map(strategies, function(strategy, i, _, rs) {
            return strategy.connect(minPriority, callbackBuilder(i, rs));
          });
          return {
            abort: /* @__PURE__ */ __name(function() {
              apply(runners, abortRunner);
            }, "abort"),
            forceMinPriority: /* @__PURE__ */ __name(function(p) {
              apply(runners, function(runner) {
                runner.forceMinPriority(p);
              });
            }, "forceMinPriority")
          };
        }
        __name(connect, "connect");
        function allRunnersFailed(runners) {
          return collections_all(runners, function(runner) {
            return Boolean(runner.error);
          });
        }
        __name(allRunnersFailed, "allRunnersFailed");
        function abortRunner(runner) {
          if (!runner.error && !runner.aborted) {
            runner.abort();
            runner.aborted = true;
          }
        }
        __name(abortRunner, "abortRunner");
        class websocket_prioritized_cached_strategy_WebSocketPrioritizedCachedStrategy {
          static {
            __name(this, "websocket_prioritized_cached_strategy_WebSocketPrioritizedCachedStrategy");
          }
          constructor(strategy, transports2, options) {
            this.strategy = strategy;
            this.transports = transports2;
            this.ttl = options.ttl || 1800 * 1e3;
            this.usingTLS = options.useTLS;
            this.timeline = options.timeline;
          }
          isSupported() {
            return this.strategy.isSupported();
          }
          connect(minPriority, callback) {
            var usingTLS = this.usingTLS;
            var info = fetchTransportCache(usingTLS);
            var cacheSkipCount = info && info.cacheSkipCount ? info.cacheSkipCount : 0;
            var strategies = [this.strategy];
            if (info && info.timestamp + this.ttl >= util.now()) {
              var transport = this.transports[info.transport];
              if (transport) {
                if (["ws", "wss"].includes(info.transport) || cacheSkipCount > 3) {
                  this.timeline.info({
                    cached: true,
                    transport: info.transport,
                    latency: info.latency
                  });
                  strategies.push(new sequential_strategy_SequentialStrategy([transport], {
                    timeout: info.latency * 2 + 1e3,
                    failFast: true
                  }));
                } else {
                  cacheSkipCount++;
                }
              }
            }
            var startTimestamp = util.now();
            var runner = strategies.pop().connect(minPriority, /* @__PURE__ */ __name(function cb(error, handshake) {
              if (error) {
                flushTransportCache(usingTLS);
                if (strategies.length > 0) {
                  startTimestamp = util.now();
                  runner = strategies.pop().connect(minPriority, cb);
                } else {
                  callback(error);
                }
              } else {
                storeTransportCache(usingTLS, handshake.transport.name, util.now() - startTimestamp, cacheSkipCount);
                callback(null, handshake);
              }
            }, "cb"));
            return {
              abort: /* @__PURE__ */ __name(function() {
                runner.abort();
              }, "abort"),
              forceMinPriority: /* @__PURE__ */ __name(function(p) {
                minPriority = p;
                if (runner) {
                  runner.forceMinPriority(p);
                }
              }, "forceMinPriority")
            };
          }
        }
        function getTransportCacheKey(usingTLS) {
          return "pusherTransport" + (usingTLS ? "TLS" : "NonTLS");
        }
        __name(getTransportCacheKey, "getTransportCacheKey");
        function fetchTransportCache(usingTLS) {
          var storage = node_runtime.getLocalStorage();
          if (storage) {
            try {
              var serializedCache = storage[getTransportCacheKey(usingTLS)];
              if (serializedCache) {
                return JSON.parse(serializedCache);
              }
            } catch (e) {
              flushTransportCache(usingTLS);
            }
          }
          return null;
        }
        __name(fetchTransportCache, "fetchTransportCache");
        function storeTransportCache(usingTLS, transport, latency, cacheSkipCount) {
          var storage = node_runtime.getLocalStorage();
          if (storage) {
            try {
              storage[getTransportCacheKey(usingTLS)] = safeJSONStringify({
                timestamp: util.now(),
                transport,
                latency,
                cacheSkipCount
              });
            } catch (e) {
            }
          }
        }
        __name(storeTransportCache, "storeTransportCache");
        function flushTransportCache(usingTLS) {
          var storage = node_runtime.getLocalStorage();
          if (storage) {
            try {
              delete storage[getTransportCacheKey(usingTLS)];
            } catch (e) {
            }
          }
        }
        __name(flushTransportCache, "flushTransportCache");
        class delayed_strategy_DelayedStrategy {
          static {
            __name(this, "delayed_strategy_DelayedStrategy");
          }
          constructor(strategy, { delay: number }) {
            this.strategy = strategy;
            this.options = { delay: number };
          }
          isSupported() {
            return this.strategy.isSupported();
          }
          connect(minPriority, callback) {
            var strategy = this.strategy;
            var runner;
            var timer = new timers_OneOffTimer(this.options.delay, function() {
              runner = strategy.connect(minPriority, callback);
            });
            return {
              abort: /* @__PURE__ */ __name(function() {
                timer.ensureAborted();
                if (runner) {
                  runner.abort();
                }
              }, "abort"),
              forceMinPriority: /* @__PURE__ */ __name(function(p) {
                minPriority = p;
                if (runner) {
                  runner.forceMinPriority(p);
                }
              }, "forceMinPriority")
            };
          }
        }
        class IfStrategy {
          static {
            __name(this, "IfStrategy");
          }
          constructor(test, trueBranch, falseBranch) {
            this.test = test;
            this.trueBranch = trueBranch;
            this.falseBranch = falseBranch;
          }
          isSupported() {
            var branch = this.test() ? this.trueBranch : this.falseBranch;
            return branch.isSupported();
          }
          connect(minPriority, callback) {
            var branch = this.test() ? this.trueBranch : this.falseBranch;
            return branch.connect(minPriority, callback);
          }
        }
        class FirstConnectedStrategy {
          static {
            __name(this, "FirstConnectedStrategy");
          }
          constructor(strategy) {
            this.strategy = strategy;
          }
          isSupported() {
            return this.strategy.isSupported();
          }
          connect(minPriority, callback) {
            var runner = this.strategy.connect(minPriority, function(error, handshake) {
              if (handshake) {
                runner.abort();
              }
              callback(error, handshake);
            });
            return runner;
          }
        }
        function testSupportsStrategy(strategy) {
          return function() {
            return strategy.isSupported();
          };
        }
        __name(testSupportsStrategy, "testSupportsStrategy");
        var getDefaultStrategy = /* @__PURE__ */ __name(function(config, baseOptions, defineTransport) {
          var definedTransports = {};
          function defineTransportStrategy(name, type, priority, options, manager) {
            var transport = defineTransport(config, name, type, priority, options, manager);
            definedTransports[name] = transport;
            return transport;
          }
          __name(defineTransportStrategy, "defineTransportStrategy");
          var ws_options = Object.assign({}, baseOptions, {
            hostNonTLS: config.wsHost + ":" + config.wsPort,
            hostTLS: config.wsHost + ":" + config.wssPort,
            httpPath: config.wsPath
          });
          var wss_options = extend({}, ws_options, {
            useTLS: true
          });
          var http_options = Object.assign({}, baseOptions, {
            hostNonTLS: config.httpHost + ":" + config.httpPort,
            hostTLS: config.httpHost + ":" + config.httpsPort,
            httpPath: config.httpPath
          });
          var timeouts = {
            loop: true,
            timeout: 15e3,
            timeoutLimit: 6e4
          };
          var ws_manager = new transport_manager_TransportManager({
            minPingDelay: 1e4,
            maxPingDelay: config.activityTimeout
          });
          var streaming_manager = new transport_manager_TransportManager({
            lives: 2,
            minPingDelay: 1e4,
            maxPingDelay: config.activityTimeout
          });
          var ws_transport = defineTransportStrategy("ws", "ws", 3, ws_options, ws_manager);
          var wss_transport = defineTransportStrategy("wss", "ws", 3, wss_options, ws_manager);
          var xhr_streaming_transport = defineTransportStrategy("xhr_streaming", "xhr_streaming", 1, http_options, streaming_manager);
          var xhr_polling_transport = defineTransportStrategy("xhr_polling", "xhr_polling", 1, http_options);
          var ws_loop = new sequential_strategy_SequentialStrategy([ws_transport], timeouts);
          var wss_loop = new sequential_strategy_SequentialStrategy([wss_transport], timeouts);
          var streaming_loop = new sequential_strategy_SequentialStrategy([xhr_streaming_transport], timeouts);
          var polling_loop = new sequential_strategy_SequentialStrategy([xhr_polling_transport], timeouts);
          var http_loop = new sequential_strategy_SequentialStrategy([
            new IfStrategy(testSupportsStrategy(streaming_loop), new best_connected_ever_strategy_BestConnectedEverStrategy([
              streaming_loop,
              new delayed_strategy_DelayedStrategy(polling_loop, { delay: 4e3 })
            ]), polling_loop)
          ], timeouts);
          var wsStrategy;
          if (baseOptions.useTLS) {
            wsStrategy = new best_connected_ever_strategy_BestConnectedEverStrategy([
              ws_loop,
              new delayed_strategy_DelayedStrategy(http_loop, { delay: 2e3 })
            ]);
          } else {
            wsStrategy = new best_connected_ever_strategy_BestConnectedEverStrategy([
              ws_loop,
              new delayed_strategy_DelayedStrategy(wss_loop, { delay: 2e3 }),
              new delayed_strategy_DelayedStrategy(http_loop, { delay: 5e3 })
            ]);
          }
          return new websocket_prioritized_cached_strategy_WebSocketPrioritizedCachedStrategy(new FirstConnectedStrategy(new IfStrategy(testSupportsStrategy(ws_transport), wsStrategy, http_loop)), definedTransports, {
            ttl: 18e5,
            timeline: baseOptions.timeline,
            useTLS: baseOptions.useTLS
          });
        }, "getDefaultStrategy");
        var default_strategy = getDefaultStrategy;
        var transport_connection_initializer = /* @__PURE__ */ __name(function() {
          var self2 = this;
          self2.timeline.info(self2.buildTimelineMessage({
            transport: self2.name + (self2.options.useTLS ? "s" : "")
          }));
          if (self2.hooks.isInitialized()) {
            self2.changeState("initialized");
          } else {
            self2.onClose();
          }
        }, "transport_connection_initializer");
        const MAX_BUFFER_LENGTH = 256 * 1024;
        class http_request_HTTPRequest extends dispatcher_Dispatcher {
          static {
            __name(this, "http_request_HTTPRequest");
          }
          constructor(hooks, method, url) {
            super();
            this.hooks = hooks;
            this.method = method;
            this.url = url;
          }
          start(payload) {
            this.position = 0;
            this.xhr = this.hooks.getRequest(this);
            this.unloader = () => {
              this.close();
            };
            node_runtime.addUnloadListener(this.unloader);
            this.xhr.open(this.method, this.url, true);
            if (this.xhr.setRequestHeader) {
              this.xhr.setRequestHeader("Content-Type", "application/json");
            }
            this.xhr.send(payload);
          }
          close() {
            if (this.unloader) {
              node_runtime.removeUnloadListener(this.unloader);
              this.unloader = null;
            }
            if (this.xhr) {
              this.hooks.abortRequest(this.xhr);
              this.xhr = null;
            }
          }
          onChunk(status, data) {
            while (true) {
              var chunk = this.advanceBuffer(data);
              if (chunk) {
                this.emit("chunk", { status, data: chunk });
              } else {
                break;
              }
            }
            if (this.isBufferTooLong(data)) {
              this.emit("buffer_too_long");
            }
          }
          advanceBuffer(buffer) {
            var unreadData = buffer.slice(this.position);
            var endOfLinePosition = unreadData.indexOf("\n");
            if (endOfLinePosition !== -1) {
              this.position += endOfLinePosition + 1;
              return unreadData.slice(0, endOfLinePosition);
            } else {
              return null;
            }
          }
          isBufferTooLong(buffer) {
            return this.position === buffer.length && buffer.length > MAX_BUFFER_LENGTH;
          }
        }
        var State;
        (function(State2) {
          State2[State2["CONNECTING"] = 0] = "CONNECTING";
          State2[State2["OPEN"] = 1] = "OPEN";
          State2[State2["CLOSED"] = 3] = "CLOSED";
        })(State || (State = {}));
        var state = State;
        var autoIncrement = 1;
        class http_socket_HTTPSocket {
          static {
            __name(this, "http_socket_HTTPSocket");
          }
          constructor(hooks, url) {
            this.hooks = hooks;
            this.session = randomNumber(1e3) + "/" + randomString(8);
            this.location = getLocation(url);
            this.readyState = state.CONNECTING;
            this.openStream();
          }
          send(payload) {
            return this.sendRaw(JSON.stringify([payload]));
          }
          ping() {
            this.hooks.sendHeartbeat(this);
          }
          close(code, reason) {
            this.onClose(code, reason, true);
          }
          sendRaw(payload) {
            if (this.readyState === state.OPEN) {
              try {
                node_runtime.createSocketRequest("POST", getUniqueURL(getSendURL(this.location, this.session))).start(payload);
                return true;
              } catch (e) {
                return false;
              }
            } else {
              return false;
            }
          }
          reconnect() {
            this.closeStream();
            this.openStream();
          }
          onClose(code, reason, wasClean) {
            this.closeStream();
            this.readyState = state.CLOSED;
            if (this.onclose) {
              this.onclose({
                code,
                reason,
                wasClean
              });
            }
          }
          onChunk(chunk) {
            if (chunk.status !== 200) {
              return;
            }
            if (this.readyState === state.OPEN) {
              this.onActivity();
            }
            var payload;
            var type = chunk.data.slice(0, 1);
            switch (type) {
              case "o":
                payload = JSON.parse(chunk.data.slice(1) || "{}");
                this.onOpen(payload);
                break;
              case "a":
                payload = JSON.parse(chunk.data.slice(1) || "[]");
                for (var i = 0; i < payload.length; i++) {
                  this.onEvent(payload[i]);
                }
                break;
              case "m":
                payload = JSON.parse(chunk.data.slice(1) || "null");
                this.onEvent(payload);
                break;
              case "h":
                this.hooks.onHeartbeat(this);
                break;
              case "c":
                payload = JSON.parse(chunk.data.slice(1) || "[]");
                this.onClose(payload[0], payload[1], true);
                break;
            }
          }
          onOpen(options) {
            if (this.readyState === state.CONNECTING) {
              if (options && options.hostname) {
                this.location.base = replaceHost(this.location.base, options.hostname);
              }
              this.readyState = state.OPEN;
              if (this.onopen) {
                this.onopen();
              }
            } else {
              this.onClose(1006, "Server lost session", true);
            }
          }
          onEvent(event) {
            if (this.readyState === state.OPEN && this.onmessage) {
              this.onmessage({ data: event });
            }
          }
          onActivity() {
            if (this.onactivity) {
              this.onactivity();
            }
          }
          onError(error) {
            if (this.onerror) {
              this.onerror(error);
            }
          }
          openStream() {
            this.stream = node_runtime.createSocketRequest("POST", getUniqueURL(this.hooks.getReceiveURL(this.location, this.session)));
            this.stream.bind("chunk", (chunk) => {
              this.onChunk(chunk);
            });
            this.stream.bind("finished", (status) => {
              this.hooks.onFinished(this, status);
            });
            this.stream.bind("buffer_too_long", () => {
              this.reconnect();
            });
            try {
              this.stream.start();
            } catch (error) {
              util.defer(() => {
                this.onError(error);
                this.onClose(1006, "Could not start streaming", false);
              });
            }
          }
          closeStream() {
            if (this.stream) {
              this.stream.unbind_all();
              this.stream.close();
              this.stream = null;
            }
          }
        }
        function getLocation(url) {
          var parts = /([^\?]*)\/*(\??.*)/.exec(url);
          return {
            base: parts[1],
            queryString: parts[2]
          };
        }
        __name(getLocation, "getLocation");
        function getSendURL(url, session) {
          return url.base + "/" + session + "/xhr_send";
        }
        __name(getSendURL, "getSendURL");
        function getUniqueURL(url) {
          var separator = url.indexOf("?") === -1 ? "?" : "&";
          return url + separator + "t=" + +/* @__PURE__ */ new Date() + "&n=" + autoIncrement++;
        }
        __name(getUniqueURL, "getUniqueURL");
        function replaceHost(url, hostname) {
          var urlParts = /(https?:\/\/)([^\/:]+)((\/|:)?.*)/.exec(url);
          return urlParts[1] + hostname + urlParts[3];
        }
        __name(replaceHost, "replaceHost");
        function randomNumber(max) {
          return node_runtime.randomInt(max);
        }
        __name(randomNumber, "randomNumber");
        function randomString(length) {
          var result = [];
          for (var i = 0; i < length; i++) {
            result.push(randomNumber(32).toString(32));
          }
          return result.join("");
        }
        __name(randomString, "randomString");
        var http_socket = http_socket_HTTPSocket;
        var http_streaming_socket_hooks = {
          getReceiveURL: /* @__PURE__ */ __name(function(url, session) {
            return url.base + "/" + session + "/xhr_streaming" + url.queryString;
          }, "getReceiveURL"),
          onHeartbeat: /* @__PURE__ */ __name(function(socket) {
            socket.sendRaw("[]");
          }, "onHeartbeat"),
          sendHeartbeat: /* @__PURE__ */ __name(function(socket) {
            socket.sendRaw("[]");
          }, "sendHeartbeat"),
          onFinished: /* @__PURE__ */ __name(function(socket, status) {
            socket.onClose(1006, "Connection interrupted (" + status + ")", false);
          }, "onFinished")
        };
        var http_streaming_socket = http_streaming_socket_hooks;
        var http_polling_socket_hooks = {
          getReceiveURL: /* @__PURE__ */ __name(function(url, session) {
            return url.base + "/" + session + "/xhr" + url.queryString;
          }, "getReceiveURL"),
          onHeartbeat: /* @__PURE__ */ __name(function() {
          }, "onHeartbeat"),
          sendHeartbeat: /* @__PURE__ */ __name(function(socket) {
            socket.sendRaw("[]");
          }, "sendHeartbeat"),
          onFinished: /* @__PURE__ */ __name(function(socket, status) {
            if (status === 200) {
              socket.reconnect();
            } else {
              socket.onClose(1006, "Connection interrupted (" + status + ")", false);
            }
          }, "onFinished")
        };
        var http_polling_socket = http_polling_socket_hooks;
        var http_xhr_request_hooks = {
          getRequest: /* @__PURE__ */ __name(function(socket) {
            var Constructor = node_runtime.getXHRAPI();
            var xhr = new Constructor();
            xhr.onreadystatechange = xhr.onprogress = function() {
              switch (xhr.readyState) {
                case 3:
                  if (xhr.responseText && xhr.responseText.length > 0) {
                    socket.onChunk(xhr.status, xhr.responseText);
                  }
                  break;
                case 4:
                  if (xhr.responseText && xhr.responseText.length > 0) {
                    socket.onChunk(xhr.status, xhr.responseText);
                  }
                  socket.emit("finished", xhr.status);
                  socket.close();
                  break;
              }
            };
            return xhr;
          }, "getRequest"),
          abortRequest: /* @__PURE__ */ __name(function(xhr) {
            xhr.onreadystatechange = null;
            xhr.abort();
          }, "abortRequest")
        };
        var http_xhr_request = http_xhr_request_hooks;
        var HTTP = {
          createStreamingSocket(url) {
            return this.createSocket(http_streaming_socket, url);
          },
          createPollingSocket(url) {
            return this.createSocket(http_polling_socket, url);
          },
          createSocket(hooks, url) {
            return new http_socket(hooks, url);
          },
          createXHR(method, url) {
            return this.createRequest(http_xhr_request, method, url);
          },
          createRequest(hooks, method, url) {
            return new http_request_HTTPRequest(hooks, method, url);
          }
        };
        var http_http = HTTP;
        var Isomorphic = {
          getDefaultStrategy: default_strategy,
          Transports: transports,
          transportConnectionInitializer: transport_connection_initializer,
          HTTPFactory: http_http,
          setup(PusherClass) {
            PusherClass.ready();
          },
          getLocalStorage() {
            return void 0;
          },
          getClientFeatures() {
            return keys(filterObject({ ws: transports.ws }, function(t) {
              return t.isSupported({});
            }));
          },
          getProtocol() {
            return "http:";
          },
          isXHRSupported() {
            return true;
          },
          createSocketRequest(method, url) {
            if (this.isXHRSupported()) {
              return this.HTTPFactory.createXHR(method, url);
            } else {
              throw "Cross-origin HTTP requests are not supported";
            }
          },
          createXHR() {
            var Constructor = this.getXHRAPI();
            return new Constructor();
          },
          createWebSocket(url) {
            var Constructor = this.getWebSocketAPI();
            return new Constructor(url);
          },
          addUnloadListener(listener) {
          },
          removeUnloadListener(listener) {
          }
        };
        var runtime = Isomorphic;
        var websocket = __webpack_require__(18);
        var XMLHttpRequest = __webpack_require__(19);
        class net_info_NetInfo extends dispatcher_Dispatcher {
          static {
            __name(this, "net_info_NetInfo");
          }
          isOnline() {
            return true;
          }
        }
        var net_info_Network = new net_info_NetInfo();
        var AuthRequestType;
        (function(AuthRequestType2) {
          AuthRequestType2["UserAuthentication"] = "user-authentication";
          AuthRequestType2["ChannelAuthorization"] = "channel-authorization";
        })(AuthRequestType || (AuthRequestType = {}));
        const ajax = /* @__PURE__ */ __name(function(context, query, authOptions, authRequestType, callback) {
          const xhr = node_runtime.createXHR();
          xhr.open("POST", authOptions.endpoint, true);
          xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
          for (var headerName in authOptions.headers) {
            xhr.setRequestHeader(headerName, authOptions.headers[headerName]);
          }
          if (authOptions.headersProvider != null) {
            let dynamicHeaders = authOptions.headersProvider();
            for (var headerName in dynamicHeaders) {
              xhr.setRequestHeader(headerName, dynamicHeaders[headerName]);
            }
          }
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                let data;
                let parsed = false;
                try {
                  data = JSON.parse(xhr.responseText);
                  parsed = true;
                } catch (e) {
                  callback(new HTTPAuthError(200, `JSON returned from ${authRequestType.toString()} endpoint was invalid, yet status code was 200. Data was: ${xhr.responseText}`), null);
                }
                if (parsed) {
                  callback(null, data);
                }
              } else {
                let suffix = "";
                switch (authRequestType) {
                  case AuthRequestType.UserAuthentication:
                    suffix = url_store.buildLogSuffix("authenticationEndpoint");
                    break;
                  case AuthRequestType.ChannelAuthorization:
                    suffix = `Clients must be authorized to join private or presence channels. ${url_store.buildLogSuffix("authorizationEndpoint")}`;
                    break;
                }
                callback(new HTTPAuthError(xhr.status, `Unable to retrieve auth string from ${authRequestType.toString()} endpoint - received status: ${xhr.status} from ${authOptions.endpoint}. ${suffix}`), null);
              }
            }
          };
          xhr.send(query);
          return xhr;
        }, "ajax");
        var xhr_auth = ajax;
        var getAgent = /* @__PURE__ */ __name(function(sender, useTLS) {
          return function(data, callback) {
            var scheme = "http" + (useTLS ? "s" : "") + "://";
            var url = scheme + (sender.host || sender.options.host) + sender.options.path;
            var query = buildQueryString(data);
            url += "/2?" + query;
            var xhr = node_runtime.createXHR();
            xhr.open("GET", url, true);
            xhr.onreadystatechange = function() {
              if (xhr.readyState === 4) {
                let { status, responseText } = xhr;
                if (status !== 200) {
                  logger.debug(`TimelineSender Error: received ${status} from stats.pusher.com`);
                  return;
                }
                try {
                  var { host } = JSON.parse(responseText);
                } catch (e) {
                  logger.debug(`TimelineSenderError: invalid response ${responseText}`);
                }
                if (host) {
                  sender.host = host;
                }
              }
            };
            xhr.send();
          };
        }, "getAgent");
        var xhr_timeline_xhr = {
          name: "xhr",
          getAgent
        };
        var xhr_timeline = xhr_timeline_xhr;
        var external_crypto_ = __webpack_require__(3);
        const { getDefaultStrategy: runtime_getDefaultStrategy, Transports: runtime_Transports, setup, getProtocol, isXHRSupported, getLocalStorage, createXHR, createWebSocket, addUnloadListener, removeUnloadListener, transportConnectionInitializer, createSocketRequest, HTTPFactory } = runtime;
        const NodeJS = {
          getDefaultStrategy: runtime_getDefaultStrategy,
          Transports: runtime_Transports,
          setup,
          getProtocol,
          isXHRSupported,
          createSocketRequest,
          getLocalStorage,
          createXHR,
          createWebSocket,
          addUnloadListener,
          removeUnloadListener,
          transportConnectionInitializer,
          HTTPFactory,
          TimelineTransport: xhr_timeline,
          getAuthorizers() {
            return { ajax: xhr_auth };
          },
          getWebSocketAPI() {
            return websocket["Client"];
          },
          getXHRAPI() {
            return XMLHttpRequest["XMLHttpRequest"];
          },
          getNetwork() {
            return net_info_Network;
          },
          randomInt(max) {
            return Object(external_crypto_["randomInt"])(max);
          }
        };
        var node_runtime = NodeJS;
        var TimelineLevel;
        (function(TimelineLevel2) {
          TimelineLevel2[TimelineLevel2["ERROR"] = 3] = "ERROR";
          TimelineLevel2[TimelineLevel2["INFO"] = 6] = "INFO";
          TimelineLevel2[TimelineLevel2["DEBUG"] = 7] = "DEBUG";
        })(TimelineLevel || (TimelineLevel = {}));
        var timeline_level = TimelineLevel;
        class timeline_Timeline {
          static {
            __name(this, "timeline_Timeline");
          }
          constructor(key, session, options) {
            this.key = key;
            this.session = session;
            this.events = [];
            this.options = options || {};
            this.sent = 0;
            this.uniqueID = 0;
          }
          log(level, event) {
            if (level <= this.options.level) {
              this.events.push(extend({}, event, { timestamp: util.now() }));
              if (this.options.limit && this.events.length > this.options.limit) {
                this.events.shift();
              }
            }
          }
          error(event) {
            this.log(timeline_level.ERROR, event);
          }
          info(event) {
            this.log(timeline_level.INFO, event);
          }
          debug(event) {
            this.log(timeline_level.DEBUG, event);
          }
          isEmpty() {
            return this.events.length === 0;
          }
          send(sendfn, callback) {
            var data = extend({
              session: this.session,
              bundle: this.sent + 1,
              key: this.key,
              lib: "js",
              version: this.options.version,
              cluster: this.options.cluster,
              features: this.options.features,
              timeline: this.events
            }, this.options.params);
            this.events = [];
            sendfn(data, (error, result) => {
              if (!error) {
                this.sent++;
              }
              if (callback) {
                callback(error, result);
              }
            });
            return true;
          }
          generateUniqueID() {
            this.uniqueID++;
            return this.uniqueID;
          }
        }
        class transport_strategy_TransportStrategy {
          static {
            __name(this, "transport_strategy_TransportStrategy");
          }
          constructor(name, priority, transport, options) {
            this.name = name;
            this.priority = priority;
            this.transport = transport;
            this.options = options || {};
          }
          isSupported() {
            return this.transport.isSupported({
              useTLS: this.options.useTLS
            });
          }
          connect(minPriority, callback) {
            if (!this.isSupported()) {
              return failAttempt(new UnsupportedStrategy(), callback);
            } else if (this.priority < minPriority) {
              return failAttempt(new TransportPriorityTooLow(), callback);
            }
            var connected = false;
            var transport = this.transport.createConnection(this.name, this.priority, this.options.key, this.options);
            var handshake = null;
            var onInitialized = /* @__PURE__ */ __name(function() {
              transport.unbind("initialized", onInitialized);
              transport.connect();
            }, "onInitialized");
            var onOpen = /* @__PURE__ */ __name(function() {
              handshake = factory.createHandshake(transport, function(result) {
                connected = true;
                unbindListeners();
                callback(null, result);
              });
            }, "onOpen");
            var onError = /* @__PURE__ */ __name(function(error) {
              unbindListeners();
              callback(error);
            }, "onError");
            var onClosed = /* @__PURE__ */ __name(function() {
              unbindListeners();
              var serializedTransport;
              serializedTransport = safeJSONStringify(transport);
              callback(new TransportClosed(serializedTransport));
            }, "onClosed");
            var unbindListeners = /* @__PURE__ */ __name(function() {
              transport.unbind("initialized", onInitialized);
              transport.unbind("open", onOpen);
              transport.unbind("error", onError);
              transport.unbind("closed", onClosed);
            }, "unbindListeners");
            transport.bind("initialized", onInitialized);
            transport.bind("open", onOpen);
            transport.bind("error", onError);
            transport.bind("closed", onClosed);
            transport.initialize();
            return {
              abort: /* @__PURE__ */ __name(() => {
                if (connected) {
                  return;
                }
                unbindListeners();
                if (handshake) {
                  handshake.close();
                } else {
                  transport.close();
                }
              }, "abort"),
              forceMinPriority: /* @__PURE__ */ __name((p) => {
                if (connected) {
                  return;
                }
                if (this.priority < p) {
                  if (handshake) {
                    handshake.close();
                  } else {
                    transport.close();
                  }
                }
              }, "forceMinPriority")
            };
          }
        }
        function failAttempt(error, callback) {
          util.defer(function() {
            callback(error);
          });
          return {
            abort: /* @__PURE__ */ __name(function() {
            }, "abort"),
            forceMinPriority: /* @__PURE__ */ __name(function() {
            }, "forceMinPriority")
          };
        }
        __name(failAttempt, "failAttempt");
        const { Transports: strategy_builder_Transports } = node_runtime;
        var strategy_builder_defineTransport = /* @__PURE__ */ __name(function(config, name, type, priority, options, manager) {
          var transportClass = strategy_builder_Transports[type];
          if (!transportClass) {
            throw new UnsupportedTransport(type);
          }
          var enabled = (!config.enabledTransports || arrayIndexOf(config.enabledTransports, name) !== -1) && (!config.disabledTransports || arrayIndexOf(config.disabledTransports, name) === -1);
          var transport;
          if (enabled) {
            options = Object.assign({ ignoreNullOrigin: config.ignoreNullOrigin }, options);
            transport = new transport_strategy_TransportStrategy(name, priority, manager ? manager.getAssistant(transportClass) : transportClass, options);
          } else {
            transport = strategy_builder_UnsupportedStrategy;
          }
          return transport;
        }, "strategy_builder_defineTransport");
        var strategy_builder_UnsupportedStrategy = {
          isSupported: /* @__PURE__ */ __name(function() {
            return false;
          }, "isSupported"),
          connect: /* @__PURE__ */ __name(function(_, callback) {
            var deferred = util.defer(function() {
              callback(new UnsupportedStrategy());
            });
            return {
              abort: /* @__PURE__ */ __name(function() {
                deferred.ensureAborted();
              }, "abort"),
              forceMinPriority: /* @__PURE__ */ __name(function() {
              }, "forceMinPriority")
            };
          }, "connect")
        };
        function validateOptions(options) {
          if (options == null) {
            throw "You must pass an options object";
          }
          if (options.cluster == null) {
            throw "Options object must provide a cluster";
          }
          if ("disableStats" in options) {
            logger.warn("The disableStats option is deprecated in favor of enableStats");
          }
        }
        __name(validateOptions, "validateOptions");
        const composeChannelQuery = /* @__PURE__ */ __name((params, authOptions) => {
          var query = "socket_id=" + encodeURIComponent(params.socketId);
          for (var key in authOptions.params) {
            query += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(authOptions.params[key]);
          }
          if (authOptions.paramsProvider != null) {
            let dynamicParams = authOptions.paramsProvider();
            for (var key in dynamicParams) {
              query += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(dynamicParams[key]);
            }
          }
          return query;
        }, "composeChannelQuery");
        const UserAuthenticator = /* @__PURE__ */ __name((authOptions) => {
          if (typeof node_runtime.getAuthorizers()[authOptions.transport] === "undefined") {
            throw `'${authOptions.transport}' is not a recognized auth transport`;
          }
          return (params, callback) => {
            const query = composeChannelQuery(params, authOptions);
            node_runtime.getAuthorizers()[authOptions.transport](node_runtime, query, authOptions, AuthRequestType.UserAuthentication, callback);
          };
        }, "UserAuthenticator");
        var user_authenticator = UserAuthenticator;
        const channel_authorizer_composeChannelQuery = /* @__PURE__ */ __name((params, authOptions) => {
          var query = "socket_id=" + encodeURIComponent(params.socketId);
          query += "&channel_name=" + encodeURIComponent(params.channelName);
          for (var key in authOptions.params) {
            query += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(authOptions.params[key]);
          }
          if (authOptions.paramsProvider != null) {
            let dynamicParams = authOptions.paramsProvider();
            for (var key in dynamicParams) {
              query += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(dynamicParams[key]);
            }
          }
          return query;
        }, "channel_authorizer_composeChannelQuery");
        const ChannelAuthorizer = /* @__PURE__ */ __name((authOptions) => {
          if (typeof node_runtime.getAuthorizers()[authOptions.transport] === "undefined") {
            throw `'${authOptions.transport}' is not a recognized auth transport`;
          }
          return (params, callback) => {
            const query = channel_authorizer_composeChannelQuery(params, authOptions);
            node_runtime.getAuthorizers()[authOptions.transport](node_runtime, query, authOptions, AuthRequestType.ChannelAuthorization, callback);
          };
        }, "ChannelAuthorizer");
        var channel_authorizer = ChannelAuthorizer;
        const ChannelAuthorizerProxy = /* @__PURE__ */ __name((pusher, authOptions, channelAuthorizerGenerator) => {
          const deprecatedAuthorizerOptions = {
            authTransport: authOptions.transport,
            authEndpoint: authOptions.endpoint,
            auth: {
              params: authOptions.params,
              headers: authOptions.headers
            }
          };
          return (params, callback) => {
            const channel = pusher.channel(params.channelName);
            const channelAuthorizer = channelAuthorizerGenerator(channel, deprecatedAuthorizerOptions);
            channelAuthorizer.authorize(params.socketId, callback);
          };
        }, "ChannelAuthorizerProxy");
        function getConfig(opts, pusher) {
          let config = {
            activityTimeout: opts.activityTimeout || defaults.activityTimeout,
            cluster: opts.cluster,
            httpPath: opts.httpPath || defaults.httpPath,
            httpPort: opts.httpPort || defaults.httpPort,
            httpsPort: opts.httpsPort || defaults.httpsPort,
            pongTimeout: opts.pongTimeout || defaults.pongTimeout,
            statsHost: opts.statsHost || defaults.stats_host,
            unavailableTimeout: opts.unavailableTimeout || defaults.unavailableTimeout,
            wsPath: opts.wsPath || defaults.wsPath,
            wsPort: opts.wsPort || defaults.wsPort,
            wssPort: opts.wssPort || defaults.wssPort,
            enableStats: getEnableStatsConfig(opts),
            httpHost: getHttpHost(opts),
            useTLS: shouldUseTLS(opts),
            wsHost: getWebsocketHost(opts),
            userAuthenticator: buildUserAuthenticator(opts),
            channelAuthorizer: buildChannelAuthorizer(opts, pusher)
          };
          if ("disabledTransports" in opts)
            config.disabledTransports = opts.disabledTransports;
          if ("enabledTransports" in opts)
            config.enabledTransports = opts.enabledTransports;
          if ("ignoreNullOrigin" in opts)
            config.ignoreNullOrigin = opts.ignoreNullOrigin;
          if ("timelineParams" in opts)
            config.timelineParams = opts.timelineParams;
          if ("nacl" in opts) {
            config.nacl = opts.nacl;
          }
          return config;
        }
        __name(getConfig, "getConfig");
        function getHttpHost(opts) {
          if (opts.httpHost) {
            return opts.httpHost;
          }
          if (opts.cluster) {
            return `sockjs-${opts.cluster}.pusher.com`;
          }
          return defaults.httpHost;
        }
        __name(getHttpHost, "getHttpHost");
        function getWebsocketHost(opts) {
          if (opts.wsHost) {
            return opts.wsHost;
          }
          return getWebsocketHostFromCluster(opts.cluster);
        }
        __name(getWebsocketHost, "getWebsocketHost");
        function getWebsocketHostFromCluster(cluster) {
          return `ws-${cluster}.pusher.com`;
        }
        __name(getWebsocketHostFromCluster, "getWebsocketHostFromCluster");
        function shouldUseTLS(opts) {
          if (node_runtime.getProtocol() === "https:") {
            return true;
          } else if (opts.forceTLS === false) {
            return false;
          }
          return true;
        }
        __name(shouldUseTLS, "shouldUseTLS");
        function getEnableStatsConfig(opts) {
          if ("enableStats" in opts) {
            return opts.enableStats;
          }
          if ("disableStats" in opts) {
            return !opts.disableStats;
          }
          return false;
        }
        __name(getEnableStatsConfig, "getEnableStatsConfig");
        function buildUserAuthenticator(opts) {
          const userAuthentication = Object.assign(Object.assign({}, defaults.userAuthentication), opts.userAuthentication);
          if ("customHandler" in userAuthentication && userAuthentication["customHandler"] != null) {
            return userAuthentication["customHandler"];
          }
          return user_authenticator(userAuthentication);
        }
        __name(buildUserAuthenticator, "buildUserAuthenticator");
        function buildChannelAuth(opts, pusher) {
          let channelAuthorization;
          if ("channelAuthorization" in opts) {
            channelAuthorization = Object.assign(Object.assign({}, defaults.channelAuthorization), opts.channelAuthorization);
          } else {
            channelAuthorization = {
              transport: opts.authTransport || defaults.authTransport,
              endpoint: opts.authEndpoint || defaults.authEndpoint
            };
            if ("auth" in opts) {
              if ("params" in opts.auth)
                channelAuthorization.params = opts.auth.params;
              if ("headers" in opts.auth)
                channelAuthorization.headers = opts.auth.headers;
            }
            if ("authorizer" in opts)
              channelAuthorization.customHandler = ChannelAuthorizerProxy(pusher, channelAuthorization, opts.authorizer);
          }
          return channelAuthorization;
        }
        __name(buildChannelAuth, "buildChannelAuth");
        function buildChannelAuthorizer(opts, pusher) {
          const channelAuthorization = buildChannelAuth(opts, pusher);
          if ("customHandler" in channelAuthorization && channelAuthorization["customHandler"] != null) {
            return channelAuthorization["customHandler"];
          }
          return channel_authorizer(channelAuthorization);
        }
        __name(buildChannelAuthorizer, "buildChannelAuthorizer");
        class watchlist_WatchlistFacade extends dispatcher_Dispatcher {
          static {
            __name(this, "watchlist_WatchlistFacade");
          }
          constructor(pusher) {
            super(function(eventName, data) {
              logger.debug(`No callbacks on watchlist events for ${eventName}`);
            });
            this.pusher = pusher;
            this.bindWatchlistInternalEvent();
          }
          handleEvent(pusherEvent) {
            pusherEvent.data.events.forEach((watchlistEvent) => {
              this.emit(watchlistEvent.name, watchlistEvent);
            });
          }
          bindWatchlistInternalEvent() {
            this.pusher.connection.bind("message", (pusherEvent) => {
              var eventName = pusherEvent.event;
              if (eventName === "pusher_internal:watchlist_events") {
                this.handleEvent(pusherEvent);
              }
            });
          }
        }
        function flatPromise() {
          let resolve, reject;
          const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
          });
          return { promise, resolve, reject };
        }
        __name(flatPromise, "flatPromise");
        var flat_promise = flatPromise;
        class user_UserFacade extends dispatcher_Dispatcher {
          static {
            __name(this, "user_UserFacade");
          }
          constructor(pusher) {
            super(function(eventName, data) {
              logger.debug("No callbacks on user for " + eventName);
            });
            this.signin_requested = false;
            this.user_data = null;
            this.serverToUserChannel = null;
            this.signinDonePromise = null;
            this._signinDoneResolve = null;
            this._onAuthorize = (err, authData) => {
              if (err) {
                logger.warn(`Error during signin: ${err}`);
                this._cleanup();
                return;
              }
              this.pusher.send_event("pusher:signin", {
                auth: authData.auth,
                user_data: authData.user_data
              });
            };
            this.pusher = pusher;
            this.pusher.connection.bind("state_change", ({ previous, current }) => {
              if (previous !== "connected" && current === "connected") {
                this._signin();
              }
              if (previous === "connected" && current !== "connected") {
                this._cleanup();
                this._newSigninPromiseIfNeeded();
              }
            });
            this.watchlist = new watchlist_WatchlistFacade(pusher);
            this.pusher.connection.bind("message", (event) => {
              var eventName = event.event;
              if (eventName === "pusher:signin_success") {
                this._onSigninSuccess(event.data);
              }
              if (this.serverToUserChannel && this.serverToUserChannel.name === event.channel) {
                this.serverToUserChannel.handleEvent(event);
              }
            });
          }
          signin() {
            if (this.signin_requested) {
              return;
            }
            this.signin_requested = true;
            this._signin();
          }
          _signin() {
            if (!this.signin_requested) {
              return;
            }
            this._newSigninPromiseIfNeeded();
            if (this.pusher.connection.state !== "connected") {
              return;
            }
            this.pusher.config.userAuthenticator({
              socketId: this.pusher.connection.socket_id
            }, this._onAuthorize);
          }
          _onSigninSuccess(data) {
            try {
              this.user_data = JSON.parse(data.user_data);
            } catch (e) {
              logger.error(`Failed parsing user data after signin: ${data.user_data}`);
              this._cleanup();
              return;
            }
            if (typeof this.user_data.id !== "string" || this.user_data.id === "") {
              logger.error(`user_data doesn't contain an id. user_data: ${this.user_data}`);
              this._cleanup();
              return;
            }
            this._signinDoneResolve();
            this._subscribeChannels();
          }
          _subscribeChannels() {
            const ensure_subscribed = /* @__PURE__ */ __name((channel) => {
              if (channel.subscriptionPending && channel.subscriptionCancelled) {
                channel.reinstateSubscription();
              } else if (!channel.subscriptionPending && this.pusher.connection.state === "connected") {
                channel.subscribe();
              }
            }, "ensure_subscribed");
            this.serverToUserChannel = new channel_Channel(`#server-to-user-${this.user_data.id}`, this.pusher);
            this.serverToUserChannel.bind_global((eventName, data) => {
              if (eventName.indexOf("pusher_internal:") === 0 || eventName.indexOf("pusher:") === 0) {
                return;
              }
              this.emit(eventName, data);
            });
            ensure_subscribed(this.serverToUserChannel);
          }
          _cleanup() {
            this.user_data = null;
            if (this.serverToUserChannel) {
              this.serverToUserChannel.unbind_all();
              this.serverToUserChannel.disconnect();
              this.serverToUserChannel = null;
            }
            if (this.signin_requested) {
              this._signinDoneResolve();
            }
          }
          _newSigninPromiseIfNeeded() {
            if (!this.signin_requested) {
              return;
            }
            if (this.signinDonePromise && !this.signinDonePromise.done) {
              return;
            }
            const { promise, resolve, reject: _ } = flat_promise();
            promise.done = false;
            const setDone = /* @__PURE__ */ __name(() => {
              promise.done = true;
            }, "setDone");
            promise.then(setDone).catch(setDone);
            this.signinDonePromise = promise;
            this._signinDoneResolve = resolve;
          }
        }
        class pusher_Pusher {
          static {
            __name(this, "pusher_Pusher");
          }
          static ready() {
            pusher_Pusher.isReady = true;
            for (var i = 0, l2 = pusher_Pusher.instances.length; i < l2; i++) {
              pusher_Pusher.instances[i].connect();
            }
          }
          static getClientFeatures() {
            return keys(filterObject({ ws: node_runtime.Transports.ws }, function(t) {
              return t.isSupported({});
            }));
          }
          constructor(app_key, options) {
            checkAppKey(app_key);
            validateOptions(options);
            this.key = app_key;
            this.config = getConfig(options, this);
            this.channels = factory.createChannels();
            this.global_emitter = new dispatcher_Dispatcher();
            this.sessionID = node_runtime.randomInt(1e9);
            this.timeline = new timeline_Timeline(this.key, this.sessionID, {
              cluster: this.config.cluster,
              features: pusher_Pusher.getClientFeatures(),
              params: this.config.timelineParams || {},
              limit: 50,
              level: timeline_level.INFO,
              version: defaults.VERSION
            });
            if (this.config.enableStats) {
              this.timelineSender = factory.createTimelineSender(this.timeline, {
                host: this.config.statsHost,
                path: "/timeline/v2/" + node_runtime.TimelineTransport.name
              });
            }
            var getStrategy = /* @__PURE__ */ __name((options2) => {
              return node_runtime.getDefaultStrategy(this.config, options2, strategy_builder_defineTransport);
            }, "getStrategy");
            this.connection = factory.createConnectionManager(this.key, {
              getStrategy,
              timeline: this.timeline,
              activityTimeout: this.config.activityTimeout,
              pongTimeout: this.config.pongTimeout,
              unavailableTimeout: this.config.unavailableTimeout,
              useTLS: Boolean(this.config.useTLS)
            });
            this.connection.bind("connected", () => {
              this.subscribeAll();
              if (this.timelineSender) {
                this.timelineSender.send(this.connection.isUsingTLS());
              }
            });
            this.connection.bind("message", (event) => {
              var eventName = event.event;
              var internal = eventName.indexOf("pusher_internal:") === 0;
              if (event.channel) {
                var channel = this.channel(event.channel);
                if (channel) {
                  channel.handleEvent(event);
                }
              }
              if (!internal) {
                this.global_emitter.emit(event.event, event.data);
              }
            });
            this.connection.bind("connecting", () => {
              this.channels.disconnect();
            });
            this.connection.bind("disconnected", () => {
              this.channels.disconnect();
            });
            this.connection.bind("error", (err) => {
              logger.warn(err);
            });
            pusher_Pusher.instances.push(this);
            this.timeline.info({ instances: pusher_Pusher.instances.length });
            this.user = new user_UserFacade(this);
            if (pusher_Pusher.isReady) {
              this.connect();
            }
          }
          channel(name) {
            return this.channels.find(name);
          }
          allChannels() {
            return this.channels.all();
          }
          connect() {
            this.connection.connect();
            if (this.timelineSender) {
              if (!this.timelineSenderTimer) {
                var usingTLS = this.connection.isUsingTLS();
                var timelineSender = this.timelineSender;
                this.timelineSenderTimer = new timers_PeriodicTimer(6e4, function() {
                  timelineSender.send(usingTLS);
                });
              }
            }
          }
          disconnect() {
            this.connection.disconnect();
            if (this.timelineSenderTimer) {
              this.timelineSenderTimer.ensureAborted();
              this.timelineSenderTimer = null;
            }
          }
          bind(event_name, callback, context) {
            this.global_emitter.bind(event_name, callback, context);
            return this;
          }
          unbind(event_name, callback, context) {
            this.global_emitter.unbind(event_name, callback, context);
            return this;
          }
          bind_global(callback) {
            this.global_emitter.bind_global(callback);
            return this;
          }
          unbind_global(callback) {
            this.global_emitter.unbind_global(callback);
            return this;
          }
          unbind_all(callback) {
            this.global_emitter.unbind_all();
            return this;
          }
          subscribeAll() {
            var channelName;
            for (channelName in this.channels.channels) {
              if (this.channels.channels.hasOwnProperty(channelName)) {
                this.subscribe(channelName);
              }
            }
          }
          subscribe(channel_name) {
            var channel = this.channels.add(channel_name, this);
            if (channel.subscriptionPending && channel.subscriptionCancelled) {
              channel.reinstateSubscription();
            } else if (!channel.subscriptionPending && this.connection.state === "connected") {
              channel.subscribe();
            }
            return channel;
          }
          unsubscribe(channel_name) {
            var channel = this.channels.find(channel_name);
            if (channel && channel.subscriptionPending) {
              channel.cancelSubscription();
            } else {
              channel = this.channels.remove(channel_name);
              if (channel && channel.subscribed) {
                channel.unsubscribe();
              }
            }
          }
          send_event(event_name, data, channel) {
            return this.connection.send_event(event_name, data, channel);
          }
          shouldUseTLS() {
            return this.config.useTLS;
          }
          signin() {
            this.user.signin();
          }
        }
        pusher_Pusher.instances = [];
        pusher_Pusher.isReady = false;
        pusher_Pusher.logToConsole = false;
        pusher_Pusher.Runtime = node_runtime;
        pusher_Pusher.ScriptReceivers = node_runtime.ScriptReceivers;
        pusher_Pusher.DependenciesReceivers = node_runtime.DependenciesReceivers;
        pusher_Pusher.auth_callbacks = node_runtime.auth_callbacks;
        var core_pusher = pusher_Pusher;
        function checkAppKey(key) {
          if (key === null || key === void 0) {
            throw "You must pass your app key when you instantiate Pusher.";
          }
        }
        __name(checkAppKey, "checkAppKey");
        node_runtime.setup(pusher_Pusher);
        var nacl_fast = __webpack_require__(20);
        class pusher_with_encryption_PusherWithEncryption extends core_pusher {
          static {
            __name(this, "pusher_with_encryption_PusherWithEncryption");
          }
          constructor(app_key, options) {
            core_pusher.logToConsole = pusher_with_encryption_PusherWithEncryption.logToConsole;
            core_pusher.log = pusher_with_encryption_PusherWithEncryption.log;
            validateOptions(options);
            options.nacl = nacl_fast;
            super(app_key, options);
          }
        }
      }
      /******/
    ]);
  }
});
export default require_pusher();
/*! Bundled license information:

pusher-js/dist/node/pusher.js:
  (*!
   * Pusher JavaScript Library v8.4.0
   * https://pusher.com/
   *
   * Copyright 2020, Pusher
   * Released under the MIT licence.
   *)
  (**
   * Wrapper for built-in http.js to emulate the browser XMLHttpRequest object.
   *
   * This can be used with JS designed for browsers to improve reuse of code and
   * allow the use of existing libraries.
   *
   * Usage: include("XMLHttpRequest.js") and use XMLHttpRequest per W3C specs.
   *
   * @author Dan DeFelippi <dan@driverdan.com>
   * @contributor David Ellis <d.f.ellis@ieee.org>
   * @license MIT
   *)
*/
//# sourceMappingURL=pusher-ASOFJFEX.mjs.map
