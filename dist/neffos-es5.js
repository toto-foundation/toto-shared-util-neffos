var __awaiter =
  (this && this.__awaiter) ||
  function (a, b, c, d) {
    function e(a) {
      return a instanceof c
        ? a
        : new c(function (b) {
            b(a);
          });
    }
    return new (c || (c = Promise))(function (c, f) {
      function g(a) {
        try {
          i(d.next(a));
        } catch (a) {
          f(a);
        }
      }
      function h(a) {
        try {
          i(d["throw"](a));
        } catch (a) {
          f(a);
        }
      }
      function i(a) {
        a.done ? c(a.value) : e(a.value).then(g, h);
      }
      i((d = d.apply(a, b || [])).next());
    });
  };
const isBrowser = "undefined" != typeof window;
var _fetch = "undefined" == typeof fetch ? void 0 : fetch;
isBrowser
  ? (WebSocket = window.WebSocket)
  : ((WebSocket = require("ws")),
    (_fetch = require("node-fetch")),
    (TextDecoder = require("@sinonjs/text-encoding").TextDecoder),
    (TextEncoder = require("@sinonjs/text-encoding").TextEncoder));
const OnNamespaceConnect = "_OnNamespaceConnect",
  OnNamespaceConnected = "_OnNamespaceConnected",
  OnNamespaceDisconnect = "_OnNamespaceDisconnect",
  OnRoomJoin = "_OnRoomJoin",
  OnRoomJoined = "_OnRoomJoined",
  OnRoomLeave = "_OnRoomLeave",
  OnRoomLeft = "_OnRoomLeft",
  OnAnyEvent = "_OnAnyEvent",
  OnNativeMessage = "_OnNativeMessage",
  ackBinary = "M",
  ackIDBinary = "A",
  ackNotOKBinary = "H",
  waitIsConfirmationPrefix = "#",
  waitComesFromClientPrefix = "$";
function isSystemEvent(a) {
  return !(
    a !== OnNamespaceConnect &&
    a !== OnNamespaceConnected &&
    a !== OnNamespaceDisconnect &&
    a !== OnRoomJoin &&
    a !== OnRoomJoined &&
    a !== OnRoomLeave &&
    a !== OnRoomLeft
  );
}
function isEmpty(a) {
  return (
    !(void 0 !== a) ||
    !(null !== a) ||
    ("" == a || "string" == typeof a || a instanceof String
      ? 0 === a.length || "" === a
      : !!(a instanceof Error) && isEmpty(a.message))
  );
}
class Message {
  isConnect() {
    return this.Event == OnNamespaceConnect || !1;
  }
  isDisconnect() {
    return this.Event == OnNamespaceDisconnect || !1;
  }
  isRoomJoin() {
    return this.Event == OnRoomJoin || !1;
  }
  isRoomLeft() {
    return this.Event == OnRoomLeft || !1;
  }
  isWait() {
    return (
      !isEmpty(this.wait) &&
      (!(this.wait[0] != waitIsConfirmationPrefix) ||
        this.wait[0] == waitComesFromClientPrefix ||
        !1)
    );
  }
  unmarshal() {
    return JSON.parse(this.Body);
  }
}
function marshal(a) {
  return JSON.stringify(a);
}
const messageSeparator = ";",
  messageFieldSeparatorReplacement = "@%!semicolon@%!",
  validMessageSepCount = 7,
  trueString = "1",
  falseString = "0",
  escapeRegExp = /;/g;
function escapeMessageField(a) {
  return isEmpty(a)
    ? ""
    : a.replace(escapeRegExp, messageFieldSeparatorReplacement);
}
const unescapeRegExp = new RegExp(messageFieldSeparatorReplacement, "g");
function unescapeMessageField(a) {
  return isEmpty(a) ? "" : a.replace(unescapeRegExp, messageSeparator);
}
class replyError extends Error {
  constructor(a) {
    super(a),
      (this.name = "replyError"),
      Error.captureStackTrace(this, replyError),
      Object.setPrototypeOf(this, replyError.prototype);
  }
}
function reply(a) {
  return new replyError(a);
}
function isReply(a) {
  return a instanceof replyError;
}
var textEncoder = new TextEncoder(),
  textDecoder = new TextDecoder("utf-8"),
  messageSeparatorCharCode = ";".charCodeAt(0);
function serializeMessage(a) {
  if (a.IsNative && isEmpty(a.wait)) return a.Body;
  let b = falseString,
    c = falseString,
    d = a.Body || "";
  isEmpty(a.Err) || ((d = a.Err.message), !isReply(a.Err) && (b = trueString)),
    a.isNoOp && (c = trueString);
  let e = [
    a.wait || "",
    escapeMessageField(a.Namespace),
    escapeMessageField(a.Room),
    escapeMessageField(a.Event),
    b,
    c,
    "",
  ].join(messageSeparator);
  if (a.SetBinary) {
    let a = textEncoder.encode(e);
    (e = new Uint8Array(a.length + d.length)), e.set(a, 0), e.set(d, a.length);
  } else
    d instanceof Uint8Array && (d = textDecoder.decode(d, { stream: !1 })),
      (e += d);
  return e;
}
function splitN(a, b, c) {
  if (0 == c) return [a];
  var d = a.split(b, c);
  if (d.length == c) {
    let c = d.join(b) + b;
    return d.push(a.substr(c.length)), d;
  }
  return [a];
}
function deserializeMessage(a, b) {
  var c = new Message();
  if (0 == a.length) return (c.isInvalid = !0), c;
  var d,
    e = a instanceof ArrayBuffer;
  if (e) {
    const b = new Uint8Array(a);
    let e = 1,
      g = 0;
    for (
      var f = 0;
      f < b.length &&
      !(
        b[f] == messageSeparatorCharCode &&
        (e++, (g = f), e == validMessageSepCount)
      );
      f++
    );
    if (e != validMessageSepCount) return (c.isInvalid = !0), c;
    (d = splitN(
      textDecoder.decode(b.slice(0, g), { stream: !1 }),
      messageSeparator,
      validMessageSepCount - 2
    )),
      d.push(a.slice(g + 1, a.length)),
      (c.SetBinary = !0);
  } else d = splitN(a, messageSeparator, validMessageSepCount - 1);
  if (d.length != validMessageSepCount)
    return (
      b ? ((c.Event = OnNativeMessage), (c.Body = a)) : (c.isInvalid = !0), c
    );
  (c.wait = d[0]),
    (c.Namespace = unescapeMessageField(d[1])),
    (c.Room = unescapeMessageField(d[2])),
    (c.Event = unescapeMessageField(d[3])),
    (c.isError = d[4] == trueString || !1),
    (c.isNoOp = d[5] == trueString || !1);
  var g = d[6];
  return (
    isEmpty(g)
      ? (c.Body = "")
      : c.isError
      ? (c.Err = new Error(g))
      : (c.Body = g),
    (c.isInvalid = !1),
    (c.IsForced = !1),
    (c.IsLocal = !1),
    (c.IsNative = (b && c.Event == OnNativeMessage) || !1),
    c
  );
}
function genWait() {
  if (!isBrowser) {
    let a = process.hrtime();
    return waitComesFromClientPrefix + 1e9 * a[0] + a[1];
  } else {
    let a = window.performance.now();
    return waitComesFromClientPrefix + a.toString();
  }
}
function genWaitConfirmation(a) {
  return waitIsConfirmationPrefix + a;
}
function genEmptyReplyToWait(a) {
  return a + messageSeparator.repeat(validMessageSepCount - 1);
}
class Room {
  constructor(a, b) {
    (this.nsConn = a), (this.name = b);
  }
  emit(a, b) {
    let c = new Message();
    return (
      (c.Namespace = this.nsConn.namespace),
      (c.Room = this.name),
      (c.Event = a),
      (c.Body = b),
      this.nsConn.conn.write(c)
    );
  }
  leave() {
    let a = new Message();
    return (
      (a.Namespace = this.nsConn.namespace),
      (a.Room = this.name),
      (a.Event = OnRoomLeave),
      this.nsConn.askRoomLeave(a)
    );
  }
}
class NSConn {
  constructor(a, b, c) {
    (this.conn = a),
      (this.namespace = b),
      (this.events = c),
      (this.rooms = new Map());
  }
  emit(a, b) {
    let c = new Message();
    return (
      (c.Namespace = this.namespace),
      (c.Event = a),
      (c.Body = b),
      this.conn.write(c)
    );
  }
  emitBinary(a, b) {
    let c = new Message();
    return (
      (c.Namespace = this.namespace),
      (c.Event = a),
      (c.Body = b),
      (c.SetBinary = !0),
      this.conn.write(c)
    );
  }
  ask(a, b) {
    let c = new Message();
    return (
      (c.Namespace = this.namespace),
      (c.Event = a),
      (c.Body = b),
      this.conn.ask(c)
    );
  }
  joinRoom(a) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.askRoomJoin(a);
    });
  }
  room(a) {
    return this.rooms.get(a);
  }
  leaveAll() {
    return __awaiter(this, void 0, void 0, function* () {
      let a = new Message();
      return (
        (a.Namespace = this.namespace),
        (a.Event = OnRoomLeft),
        (a.IsLocal = !0),
        this.rooms.forEach((b, c) =>
          __awaiter(this, void 0, void 0, function* () {
            a.Room = c;
            try {
              yield this.askRoomLeave(a);
            } catch (a) {
              return a;
            }
          })
        ),
        null
      );
    });
  }
  forceLeaveAll(a) {
    let b = new Message();
    (b.Namespace = this.namespace),
      (b.Event = OnRoomLeave),
      (b.IsForced = !0),
      (b.IsLocal = a),
      this.rooms.forEach((a, c) => {
        (b.Room = c),
          fireEvent(this, b),
          this.rooms.delete(c),
          (b.Event = OnRoomLeft),
          fireEvent(this, b),
          (b.Event = OnRoomLeave);
      });
  }
  disconnect() {
    let a = new Message();
    return (
      (a.Namespace = this.namespace),
      (a.Event = OnNamespaceDisconnect),
      this.conn.askDisconnect(a)
    );
  }
  askRoomJoin(a) {
    return new Promise((b, c) =>
      __awaiter(this, void 0, void 0, function* () {
        let d = this.rooms.get(a);
        if (void 0 !== d) return void b(d);
        let e = new Message();
        (e.Namespace = this.namespace),
          (e.Room = a),
          (e.Event = OnRoomJoin),
          (e.IsLocal = !0);
        try {
          yield this.conn.ask(e);
        } catch (a) {
          return void c(a);
        }
        let f = fireEvent(this, e);
        return isEmpty(f)
          ? void ((d = new Room(this, a)),
            this.rooms.set(a, d),
            (e.Event = OnRoomJoined),
            fireEvent(this, e),
            b(d))
          : void c(f);
      })
    );
  }
  askRoomLeave(a) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.rooms.has(a.Room)) return ErrBadRoom;
      try {
        yield this.conn.ask(a);
      } catch (a) {
        return a;
      }
      let b = fireEvent(this, a);
      return isEmpty(b)
        ? (this.rooms.delete(a.Room),
          (a.Event = OnRoomLeft),
          fireEvent(this, a),
          null)
        : b;
    });
  }
  replyRoomJoin(a) {
    if (!(isEmpty(a.wait) || a.isNoOp)) {
      if (!this.rooms.has(a.Room)) {
        let b = fireEvent(this, a);
        if (!isEmpty(b)) return (a.Err = b), void this.conn.write(a);
        this.rooms.set(a.Room, new Room(this, a.Room)),
          (a.Event = OnRoomJoined),
          fireEvent(this, a);
      }
      this.conn.writeEmptyReply(a.wait);
    }
  }
  replyRoomLeave(a) {
    return isEmpty(a.wait) || a.isNoOp
      ? void 0
      : this.rooms.has(a.Room)
      ? void (fireEvent(this, a),
        this.rooms.delete(a.Room),
        this.conn.writeEmptyReply(a.wait),
        (a.Event = OnRoomLeft),
        fireEvent(this, a))
      : void this.conn.writeEmptyReply(a.wait);
  }
}
function fireEvent(a, b) {
  return a.events.has(b.Event)
    ? a.events.get(b.Event)(a, b)
    : a.events.has(OnAnyEvent)
    ? a.events.get(OnAnyEvent)(a, b)
    : null;
}
function isNull(a) {
  return null === a || a === void 0 || "undefined" == typeof a;
}
function resolveNamespaces(a, b) {
  if (isNull(a)) return isNull(b) || b("connHandler is empty."), null;
  let c = new Map(),
    d = new Map(),
    e = 0;
  if (
    (Object.keys(a).forEach(function (b, f) {
      e++;
      let g = a[b];
      if (g instanceof Function) d.set(b, g);
      else if (g instanceof Map) c.set(b, g);
      else {
        let a = new Map();
        Object.keys(g).forEach(function (b, c) {
          a.set(b, g[b]);
        }),
          c.set(b, a);
      }
    }),
    0 < d.size)
  ) {
    if (e != d.size)
      return (
        isNull(b) ||
          b(
            "all keys of connHandler should be events, mix of namespaces and event callbacks is not supported " +
              d.size +
              " vs total " +
              e
          ),
        null
      );
    c.set("", d);
  }
  return c;
}
function getEvents(a, b) {
  return a.has(b) ? a.get(b) : null;
}
const URLParamAsHeaderPrefix = "X-Websocket-Header-";
function parseHeadersAsURLParameters(a, b) {
  if (isNull(a)) return b;
  for (let c in a)
    if (a.hasOwnProperty(c)) {
      let d = a[c];
      (c = encodeURIComponent(URLParamAsHeaderPrefix + c)),
        (d = encodeURIComponent(d));
      const e = c + "=" + d;
      b =
        -1 == b.indexOf("?")
          ? -1 == b.indexOf("#")
            ? b + "?" + e
            : b.split("#")[0] + "?" + e + "#" + b.split("#")[1]
          : b.split("?")[0] + "?" + e + "&" + b.split("?")[1];
    }
  return b;
}
function dial(a, b, c) {
  return _dial(a, b, 0, c);
}
const websocketReconnectHeaderKey = "X-Websocket-Reconnect";
function _dial(a, b, c, d) {
  if (isBrowser && 0 == a.indexOf("/")) {
    const b = "https:" == document.location.protocol ? "wss" : "ws",
      c = document.location.port ? ":" + document.location.port : "";
    a = b + "://" + document.location.hostname + c + a;
  }
  return (
    -1 == a.indexOf("ws") && (a = "ws://" + a),
    new Promise((e, f) => {
      WebSocket || f("WebSocket is not accessible through this browser.");
      let g = resolveNamespaces(b, f);
      if (isNull(g)) return;
      isNull(d) && (d = {}), isNull(d.headers) && (d.headers = {});
      const h = d.reconnect ? d.reconnect : 0;
      0 < c && 0 < h
        ? (d.headers[websocketReconnectHeaderKey] = c.toString())
        : !isNull(d.headers[websocketReconnectHeaderKey]) &&
          delete d.headers[websocketReconnectHeaderKey];
      const i = makeWebsocketConnection(a, d);
      let j = new Conn(i, g);
      (j.reconnectTries = c),
        (i.binaryType = "arraybuffer"),
        (i.onmessage = (a) => {
          let b = j.handle(a);
          return isEmpty(b) ? void (j.isAcknowledged() && e(j)) : void f(b);
        }),
        (i.onopen = (a) => {
          i.send(ackBinary);
        }),
        (i.onerror = (a) => {
          j.close(), f(a);
        }),
        (i.onclose = (c) => {
          if (j.isClosed());
          else {
            if (
              ((i.onmessage = void 0),
              (i.onopen = void 0),
              (i.onerror = void 0),
              (i.onclose = void 0),
              0 >= h)
            )
              return j.close(), null;
            let c = new Map();
            j.connectedNamespaces.forEach((a, b) => {
              let d = [];
              !isNull(a.rooms) &&
                0 < a.rooms.size &&
                a.rooms.forEach((a, b) => {
                  d.push(b);
                }),
                c.set(b, d);
            }),
              j.close(),
              whenResourceOnline(a, h, (g) => {
                _dial(a, b, g, d)
                  .then((a) =>
                    isNull(e) || "function () { [native code] }" == e.toString()
                      ? void c.forEach((b, c) => {
                          let d = (a) => (b) => {
                            a.forEach((a) => {
                              b.joinRoom(a);
                            });
                          };
                          a.connect(c).then(d(b));
                        })
                      : void e(a)
                  )
                  .catch(f);
              });
          }
          return null;
        });
    })
  );
}
function makeWebsocketConnection(a, b) {
  return isBrowser && !isNull(b)
    ? (b.headers && (a = parseHeadersAsURLParameters(b.headers, a)),
      b.protocols ? new WebSocket(a, b.protocols) : new WebSocket(a))
    : new WebSocket(a, b);
}
function whenResourceOnline(a, b, c) {
  let d = a.replace(/(ws)(s)?\:\/\//, "http$2://"),
    e = 1;
  const f = { method: "HEAD", mode: "no-cors" };
  let g = () => {
    const a = () => {
      e++,
        setTimeout(() => {
          g();
        }, b);
    };

    _fetch(d, f)
      .then((b) => {
        b.ok ? c(e) : a();
      })
      .catch((b) => {
        a();
      });
  };
  setTimeout(g, b);
}
const ErrInvalidPayload = new Error("invalid payload"),
  ErrBadNamespace = new Error("bad namespace"),
  ErrBadRoom = new Error("bad room"),
  ErrClosed = new Error("use of closed connection"),
  ErrWrite = new Error("write closed");
function isCloseError(a) {
  return (
    !(!a || isEmpty(a.message)) && 0 <= a.message.indexOf("[-1] write closed")
  );
}
class Conn {
  constructor(a, b) {
    (this.conn = a),
      (this.reconnectTries = 0),
      (this._isAcknowledged = !1),
      (this.namespaces = b);
    let c = b.has("");
    (this.allowNativeMessages = c && b.get("").has(OnNativeMessage)),
      (this.queue = []),
      (this.waitingMessages = new Map()),
      (this.connectedNamespaces = new Map()),
      (this.closed = !1);
  }
  wasReconnected() {
    return 0 < this.reconnectTries;
  }
  isAcknowledged() {
    return this._isAcknowledged;
  }
  handle(a) {
    if (!this._isAcknowledged) {
      let b = this.handleAck(a.data);
      return (
        null == b
          ? ((this._isAcknowledged = !0), this.handleQueue())
          : this.conn.close(),
        b
      );
    }
    return this.handleMessage(a.data);
  }
  handleAck(a) {
    let b = a[0];
    switch (b) {
      case ackIDBinary:
        let b = a.slice(1);
        this.ID = b;
        break;
      case ackNotOKBinary:
        let c = a.slice(1);
        return new Error(c);
      default:
        return this.queue.push(a), null;
    }
  }
  handleQueue() {
    null == this.queue ||
      0 == this.queue.length ||
      this.queue.forEach((a, b) => {
        this.queue.splice(b, 1), this.handleMessage(a);
      });
  }
  handleMessage(a) {
    let b = deserializeMessage(a, this.allowNativeMessages);
    if (b.isInvalid) return ErrInvalidPayload;
    if (b.IsNative && this.allowNativeMessages) {
      let a = this.namespace("");
      return fireEvent(a, b);
    }
    if (b.isWait()) {
      let a = this.waitingMessages.get(b.wait);
      if (null != a) return void a(b);
    }
    const c = this.namespace(b.Namespace);
    switch (b.Event) {
      case OnNamespaceConnect:
        this.replyConnect(b);
        break;
      case OnNamespaceDisconnect:
        this.replyDisconnect(b);
        break;
      case OnRoomJoin:
        if (c !== void 0) {
          c.replyRoomJoin(b);
          break;
        }
      case OnRoomLeave:
        if (c !== void 0) {
          c.replyRoomLeave(b);
          break;
        }
      default:
        if (c === void 0) return ErrBadNamespace;
        b.IsLocal = !1;
        const a = fireEvent(c, b);
        if (!isEmpty(a)) return (b.Err = a), this.write(b), a;
    }
    return null;
  }
  connect(a) {
    return this.askConnect(a);
  }
  waitServerConnect(a) {
    return (
      isNull(this.waitServerConnectNotifiers) &&
        (this.waitServerConnectNotifiers = new Map()),
      new Promise((b, c) =>
        __awaiter(this, void 0, void 0, function* () {
          this.waitServerConnectNotifiers.set(a, () => {
            this.waitServerConnectNotifiers.delete(a), b(this.namespace(a));
          });
        })
      )
    );
  }
  namespace(a) {
    return this.connectedNamespaces.get(a);
  }
  replyConnect(a) {
    if (isEmpty(a.wait) || a.isNoOp) return;
    let b = this.namespace(a.Namespace);
    if (void 0 !== b) return void this.writeEmptyReply(a.wait);
    let c = getEvents(this.namespaces, a.Namespace);
    return isNull(c)
      ? ((a.Err = ErrBadNamespace), void this.write(a))
      : void ((b = new NSConn(this, a.Namespace, c)),
        this.connectedNamespaces.set(a.Namespace, b),
        this.writeEmptyReply(a.wait),
        (a.Event = OnNamespaceConnected),
        fireEvent(b, a),
        !isNull(this.waitServerConnectNotifiers) &&
          0 < this.waitServerConnectNotifiers.size &&
          this.waitServerConnectNotifiers.has(a.Namespace) &&
          this.waitServerConnectNotifiers.get(a.Namespace)());
  }
  replyDisconnect(a) {
    if (!(isEmpty(a.wait) || a.isNoOp)) {
      let b = this.namespace(a.Namespace);
      return void 0 === b
        ? void this.writeEmptyReply(a.wait)
        : void (b.forceLeaveAll(!0),
          this.connectedNamespaces.delete(a.Namespace),
          this.writeEmptyReply(a.wait),
          fireEvent(b, a));
    }
  }
  ask(a) {
    return new Promise((b, c) =>
      this.isClosed()
        ? void c(ErrClosed)
        : ((a.wait = genWait()),
          this.waitingMessages.set(a.wait, (a) =>
            a.isError ? void c(a.Err) : void b(a)
          ),
          !this.write(a))
        ? void c(ErrWrite)
        : void 0
    );
  }
  askConnect(a) {
    return new Promise((b, c) =>
      __awaiter(this, void 0, void 0, function* () {
        let d = this.namespace(a);
        if (void 0 !== d) return void b(d);
        let e = getEvents(this.namespaces, a);
        if (isNull(e)) return void c(ErrBadNamespace);
        let f = new Message();
        (f.Namespace = a),
          (f.Event = OnNamespaceConnect),
          (f.IsLocal = !0),
          (d = new NSConn(this, a, e));
        let g = fireEvent(d, f);
        if (!isEmpty(g)) return void c(g);
        try {
          yield this.ask(f);
        } catch (a) {
          return void c(a);
        }
        this.connectedNamespaces.set(a, d),
          (f.Event = OnNamespaceConnected),
          fireEvent(d, f),
          b(d);
      })
    );
  }
  askDisconnect(a) {
    return __awaiter(this, void 0, void 0, function* () {
      let b = this.namespace(a.Namespace);
      if (void 0 === b) return ErrBadNamespace;
      try {
        yield this.ask(a);
      } catch (a) {
        return a;
      }
      return (
        b.forceLeaveAll(!0),
        this.connectedNamespaces.delete(a.Namespace),
        (a.IsLocal = !0),
        fireEvent(b, a)
      );
    });
  }
  isClosed() {
    return this.closed;
  }
  write(a) {
    if (this.isClosed()) return !1;
    if (!a.isConnect() && !a.isDisconnect()) {
      let b = this.namespace(a.Namespace);
      if (void 0 === b) return !1;
      if (
        !isEmpty(a.Room) &&
        !a.isRoomJoin() &&
        !a.isRoomLeft() &&
        !b.rooms.has(a.Room)
      )
        return !1;
    }
    return this.conn.send(serializeMessage(a)), !0;
  }
  writeEmptyReply(a) {
    this.conn.send(genEmptyReplyToWait(a));
  }
  close() {
    if (this.closed) return;
    let a = new Message();
    (a.Event = OnNamespaceDisconnect),
      (a.IsForced = !0),
      (a.IsLocal = !0),
      this.connectedNamespaces.forEach((b) => {
        b.forceLeaveAll(!0),
          (a.Namespace = b.namespace),
          fireEvent(b, a),
          this.connectedNamespaces.delete(b.namespace);
      }),
      this.waitingMessages.clear(),
      (this.closed = !0),
      this.conn.readyState === this.conn.OPEN && this.conn.close();
  }
}
(function () {
  const a = {
    dial: dial,
    isSystemEvent: isSystemEvent,
    OnNamespaceConnect: OnNamespaceConnect,
    OnNamespaceConnected: OnNamespaceConnected,
    OnNamespaceDisconnect: OnNamespaceDisconnect,
    OnRoomJoin: OnRoomJoin,
    OnRoomJoined: OnRoomJoined,
    OnRoomLeave: OnRoomLeave,
    OnRoomLeft: OnRoomLeft,
    OnAnyEvent: OnAnyEvent,
    OnNativeMessage: OnNativeMessage,
    Message: Message,
    Room: Room,
    NSConn: NSConn,
    Conn: Conn,
    ErrInvalidPayload: ErrInvalidPayload,
    ErrBadNamespace: ErrBadNamespace,
    ErrBadRoom: ErrBadRoom,
    ErrClosed: ErrClosed,
    ErrWrite: ErrWrite,
    isCloseError: isCloseError,
    reply: reply,
    marshal: marshal,
  };
  if ("undefined" != typeof exports) (exports = a), (module.exports = a);
  else {
    var b =
      ("object" == typeof self && self.self === self && self) ||
      ("object" == typeof global && global.global === global && global);
    b.neffos = a;
  }
})();
