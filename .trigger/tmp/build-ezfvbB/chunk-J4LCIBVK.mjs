import {
  ZodError,
  ZodFirstPartyTypeKind,
  ZodNever,
  ZodType,
  anyType,
  external_exports,
  neverType,
  objectType,
  recordType,
  unionType,
  v3_default
} from "./chunk-YHJ4RCX5.mjs";
import {
  __commonJS,
  __name,
  __require,
  __toESM,
  init_esm
} from "./chunk-262SQFPS.mjs";

// node_modules/color-name/index.js
var require_color_name = __commonJS({
  "node_modules/color-name/index.js"(exports, module) {
    "use strict";
    init_esm();
    module.exports = {
      "aliceblue": [240, 248, 255],
      "antiquewhite": [250, 235, 215],
      "aqua": [0, 255, 255],
      "aquamarine": [127, 255, 212],
      "azure": [240, 255, 255],
      "beige": [245, 245, 220],
      "bisque": [255, 228, 196],
      "black": [0, 0, 0],
      "blanchedalmond": [255, 235, 205],
      "blue": [0, 0, 255],
      "blueviolet": [138, 43, 226],
      "brown": [165, 42, 42],
      "burlywood": [222, 184, 135],
      "cadetblue": [95, 158, 160],
      "chartreuse": [127, 255, 0],
      "chocolate": [210, 105, 30],
      "coral": [255, 127, 80],
      "cornflowerblue": [100, 149, 237],
      "cornsilk": [255, 248, 220],
      "crimson": [220, 20, 60],
      "cyan": [0, 255, 255],
      "darkblue": [0, 0, 139],
      "darkcyan": [0, 139, 139],
      "darkgoldenrod": [184, 134, 11],
      "darkgray": [169, 169, 169],
      "darkgreen": [0, 100, 0],
      "darkgrey": [169, 169, 169],
      "darkkhaki": [189, 183, 107],
      "darkmagenta": [139, 0, 139],
      "darkolivegreen": [85, 107, 47],
      "darkorange": [255, 140, 0],
      "darkorchid": [153, 50, 204],
      "darkred": [139, 0, 0],
      "darksalmon": [233, 150, 122],
      "darkseagreen": [143, 188, 143],
      "darkslateblue": [72, 61, 139],
      "darkslategray": [47, 79, 79],
      "darkslategrey": [47, 79, 79],
      "darkturquoise": [0, 206, 209],
      "darkviolet": [148, 0, 211],
      "deeppink": [255, 20, 147],
      "deepskyblue": [0, 191, 255],
      "dimgray": [105, 105, 105],
      "dimgrey": [105, 105, 105],
      "dodgerblue": [30, 144, 255],
      "firebrick": [178, 34, 34],
      "floralwhite": [255, 250, 240],
      "forestgreen": [34, 139, 34],
      "fuchsia": [255, 0, 255],
      "gainsboro": [220, 220, 220],
      "ghostwhite": [248, 248, 255],
      "gold": [255, 215, 0],
      "goldenrod": [218, 165, 32],
      "gray": [128, 128, 128],
      "green": [0, 128, 0],
      "greenyellow": [173, 255, 47],
      "grey": [128, 128, 128],
      "honeydew": [240, 255, 240],
      "hotpink": [255, 105, 180],
      "indianred": [205, 92, 92],
      "indigo": [75, 0, 130],
      "ivory": [255, 255, 240],
      "khaki": [240, 230, 140],
      "lavender": [230, 230, 250],
      "lavenderblush": [255, 240, 245],
      "lawngreen": [124, 252, 0],
      "lemonchiffon": [255, 250, 205],
      "lightblue": [173, 216, 230],
      "lightcoral": [240, 128, 128],
      "lightcyan": [224, 255, 255],
      "lightgoldenrodyellow": [250, 250, 210],
      "lightgray": [211, 211, 211],
      "lightgreen": [144, 238, 144],
      "lightgrey": [211, 211, 211],
      "lightpink": [255, 182, 193],
      "lightsalmon": [255, 160, 122],
      "lightseagreen": [32, 178, 170],
      "lightskyblue": [135, 206, 250],
      "lightslategray": [119, 136, 153],
      "lightslategrey": [119, 136, 153],
      "lightsteelblue": [176, 196, 222],
      "lightyellow": [255, 255, 224],
      "lime": [0, 255, 0],
      "limegreen": [50, 205, 50],
      "linen": [250, 240, 230],
      "magenta": [255, 0, 255],
      "maroon": [128, 0, 0],
      "mediumaquamarine": [102, 205, 170],
      "mediumblue": [0, 0, 205],
      "mediumorchid": [186, 85, 211],
      "mediumpurple": [147, 112, 219],
      "mediumseagreen": [60, 179, 113],
      "mediumslateblue": [123, 104, 238],
      "mediumspringgreen": [0, 250, 154],
      "mediumturquoise": [72, 209, 204],
      "mediumvioletred": [199, 21, 133],
      "midnightblue": [25, 25, 112],
      "mintcream": [245, 255, 250],
      "mistyrose": [255, 228, 225],
      "moccasin": [255, 228, 181],
      "navajowhite": [255, 222, 173],
      "navy": [0, 0, 128],
      "oldlace": [253, 245, 230],
      "olive": [128, 128, 0],
      "olivedrab": [107, 142, 35],
      "orange": [255, 165, 0],
      "orangered": [255, 69, 0],
      "orchid": [218, 112, 214],
      "palegoldenrod": [238, 232, 170],
      "palegreen": [152, 251, 152],
      "paleturquoise": [175, 238, 238],
      "palevioletred": [219, 112, 147],
      "papayawhip": [255, 239, 213],
      "peachpuff": [255, 218, 185],
      "peru": [205, 133, 63],
      "pink": [255, 192, 203],
      "plum": [221, 160, 221],
      "powderblue": [176, 224, 230],
      "purple": [128, 0, 128],
      "rebeccapurple": [102, 51, 153],
      "red": [255, 0, 0],
      "rosybrown": [188, 143, 143],
      "royalblue": [65, 105, 225],
      "saddlebrown": [139, 69, 19],
      "salmon": [250, 128, 114],
      "sandybrown": [244, 164, 96],
      "seagreen": [46, 139, 87],
      "seashell": [255, 245, 238],
      "sienna": [160, 82, 45],
      "silver": [192, 192, 192],
      "skyblue": [135, 206, 235],
      "slateblue": [106, 90, 205],
      "slategray": [112, 128, 144],
      "slategrey": [112, 128, 144],
      "snow": [255, 250, 250],
      "springgreen": [0, 255, 127],
      "steelblue": [70, 130, 180],
      "tan": [210, 180, 140],
      "teal": [0, 128, 128],
      "thistle": [216, 191, 216],
      "tomato": [255, 99, 71],
      "turquoise": [64, 224, 208],
      "violet": [238, 130, 238],
      "wheat": [245, 222, 179],
      "white": [255, 255, 255],
      "whitesmoke": [245, 245, 245],
      "yellow": [255, 255, 0],
      "yellowgreen": [154, 205, 50]
    };
  }
});

// node_modules/color-convert/conversions.js
var require_conversions = __commonJS({
  "node_modules/color-convert/conversions.js"(exports, module) {
    init_esm();
    var cssKeywords = require_color_name();
    var reverseKeywords = {};
    for (const key of Object.keys(cssKeywords)) {
      reverseKeywords[cssKeywords[key]] = key;
    }
    var convert = {
      rgb: { channels: 3, labels: "rgb" },
      hsl: { channels: 3, labels: "hsl" },
      hsv: { channels: 3, labels: "hsv" },
      hwb: { channels: 3, labels: "hwb" },
      cmyk: { channels: 4, labels: "cmyk" },
      xyz: { channels: 3, labels: "xyz" },
      lab: { channels: 3, labels: "lab" },
      lch: { channels: 3, labels: "lch" },
      hex: { channels: 1, labels: ["hex"] },
      keyword: { channels: 1, labels: ["keyword"] },
      ansi16: { channels: 1, labels: ["ansi16"] },
      ansi256: { channels: 1, labels: ["ansi256"] },
      hcg: { channels: 3, labels: ["h", "c", "g"] },
      apple: { channels: 3, labels: ["r16", "g16", "b16"] },
      gray: { channels: 1, labels: ["gray"] }
    };
    module.exports = convert;
    for (const model of Object.keys(convert)) {
      if (!("channels" in convert[model])) {
        throw new Error("missing channels property: " + model);
      }
      if (!("labels" in convert[model])) {
        throw new Error("missing channel labels property: " + model);
      }
      if (convert[model].labels.length !== convert[model].channels) {
        throw new Error("channel and label counts mismatch: " + model);
      }
      const { channels, labels } = convert[model];
      delete convert[model].channels;
      delete convert[model].labels;
      Object.defineProperty(convert[model], "channels", { value: channels });
      Object.defineProperty(convert[model], "labels", { value: labels });
    }
    convert.rgb.hsl = function(rgb) {
      const r = rgb[0] / 255;
      const g = rgb[1] / 255;
      const b = rgb[2] / 255;
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      const delta = max - min;
      let h;
      let s;
      if (max === min) {
        h = 0;
      } else if (r === max) {
        h = (g - b) / delta;
      } else if (g === max) {
        h = 2 + (b - r) / delta;
      } else if (b === max) {
        h = 4 + (r - g) / delta;
      }
      h = Math.min(h * 60, 360);
      if (h < 0) {
        h += 360;
      }
      const l = (min + max) / 2;
      if (max === min) {
        s = 0;
      } else if (l <= 0.5) {
        s = delta / (max + min);
      } else {
        s = delta / (2 - max - min);
      }
      return [h, s * 100, l * 100];
    };
    convert.rgb.hsv = function(rgb) {
      let rdif;
      let gdif;
      let bdif;
      let h;
      let s;
      const r = rgb[0] / 255;
      const g = rgb[1] / 255;
      const b = rgb[2] / 255;
      const v = Math.max(r, g, b);
      const diff = v - Math.min(r, g, b);
      const diffc = /* @__PURE__ */ __name(function(c) {
        return (v - c) / 6 / diff + 1 / 2;
      }, "diffc");
      if (diff === 0) {
        h = 0;
        s = 0;
      } else {
        s = diff / v;
        rdif = diffc(r);
        gdif = diffc(g);
        bdif = diffc(b);
        if (r === v) {
          h = bdif - gdif;
        } else if (g === v) {
          h = 1 / 3 + rdif - bdif;
        } else if (b === v) {
          h = 2 / 3 + gdif - rdif;
        }
        if (h < 0) {
          h += 1;
        } else if (h > 1) {
          h -= 1;
        }
      }
      return [
        h * 360,
        s * 100,
        v * 100
      ];
    };
    convert.rgb.hwb = function(rgb) {
      const r = rgb[0];
      const g = rgb[1];
      let b = rgb[2];
      const h = convert.rgb.hsl(rgb)[0];
      const w = 1 / 255 * Math.min(r, Math.min(g, b));
      b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));
      return [h, w * 100, b * 100];
    };
    convert.rgb.cmyk = function(rgb) {
      const r = rgb[0] / 255;
      const g = rgb[1] / 255;
      const b = rgb[2] / 255;
      const k = Math.min(1 - r, 1 - g, 1 - b);
      const c = (1 - r - k) / (1 - k) || 0;
      const m = (1 - g - k) / (1 - k) || 0;
      const y = (1 - b - k) / (1 - k) || 0;
      return [c * 100, m * 100, y * 100, k * 100];
    };
    function comparativeDistance(x, y) {
      return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2;
    }
    __name(comparativeDistance, "comparativeDistance");
    convert.rgb.keyword = function(rgb) {
      const reversed = reverseKeywords[rgb];
      if (reversed) {
        return reversed;
      }
      let currentClosestDistance = Infinity;
      let currentClosestKeyword;
      for (const keyword of Object.keys(cssKeywords)) {
        const value = cssKeywords[keyword];
        const distance = comparativeDistance(rgb, value);
        if (distance < currentClosestDistance) {
          currentClosestDistance = distance;
          currentClosestKeyword = keyword;
        }
      }
      return currentClosestKeyword;
    };
    convert.keyword.rgb = function(keyword) {
      return cssKeywords[keyword];
    };
    convert.rgb.xyz = function(rgb) {
      let r = rgb[0] / 255;
      let g = rgb[1] / 255;
      let b = rgb[2] / 255;
      r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
      g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
      b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;
      const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
      const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
      return [x * 100, y * 100, z * 100];
    };
    convert.rgb.lab = function(rgb) {
      const xyz = convert.rgb.xyz(rgb);
      let x = xyz[0];
      let y = xyz[1];
      let z = xyz[2];
      x /= 95.047;
      y /= 100;
      z /= 108.883;
      x = x > 8856e-6 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
      y = y > 8856e-6 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
      z = z > 8856e-6 ? z ** (1 / 3) : 7.787 * z + 16 / 116;
      const l = 116 * y - 16;
      const a = 500 * (x - y);
      const b = 200 * (y - z);
      return [l, a, b];
    };
    convert.hsl.rgb = function(hsl) {
      const h = hsl[0] / 360;
      const s = hsl[1] / 100;
      const l = hsl[2] / 100;
      let t2;
      let t3;
      let val;
      if (s === 0) {
        val = l * 255;
        return [val, val, val];
      }
      if (l < 0.5) {
        t2 = l * (1 + s);
      } else {
        t2 = l + s - l * s;
      }
      const t1 = 2 * l - t2;
      const rgb = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        t3 = h + 1 / 3 * -(i - 1);
        if (t3 < 0) {
          t3++;
        }
        if (t3 > 1) {
          t3--;
        }
        if (6 * t3 < 1) {
          val = t1 + (t2 - t1) * 6 * t3;
        } else if (2 * t3 < 1) {
          val = t2;
        } else if (3 * t3 < 2) {
          val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
        } else {
          val = t1;
        }
        rgb[i] = val * 255;
      }
      return rgb;
    };
    convert.hsl.hsv = function(hsl) {
      const h = hsl[0];
      let s = hsl[1] / 100;
      let l = hsl[2] / 100;
      let smin = s;
      const lmin = Math.max(l, 0.01);
      l *= 2;
      s *= l <= 1 ? l : 2 - l;
      smin *= lmin <= 1 ? lmin : 2 - lmin;
      const v = (l + s) / 2;
      const sv = l === 0 ? 2 * smin / (lmin + smin) : 2 * s / (l + s);
      return [h, sv * 100, v * 100];
    };
    convert.hsv.rgb = function(hsv) {
      const h = hsv[0] / 60;
      const s = hsv[1] / 100;
      let v = hsv[2] / 100;
      const hi = Math.floor(h) % 6;
      const f = h - Math.floor(h);
      const p = 255 * v * (1 - s);
      const q = 255 * v * (1 - s * f);
      const t = 255 * v * (1 - s * (1 - f));
      v *= 255;
      switch (hi) {
        case 0:
          return [v, t, p];
        case 1:
          return [q, v, p];
        case 2:
          return [p, v, t];
        case 3:
          return [p, q, v];
        case 4:
          return [t, p, v];
        case 5:
          return [v, p, q];
      }
    };
    convert.hsv.hsl = function(hsv) {
      const h = hsv[0];
      const s = hsv[1] / 100;
      const v = hsv[2] / 100;
      const vmin = Math.max(v, 0.01);
      let sl;
      let l;
      l = (2 - s) * v;
      const lmin = (2 - s) * vmin;
      sl = s * vmin;
      sl /= lmin <= 1 ? lmin : 2 - lmin;
      sl = sl || 0;
      l /= 2;
      return [h, sl * 100, l * 100];
    };
    convert.hwb.rgb = function(hwb) {
      const h = hwb[0] / 360;
      let wh = hwb[1] / 100;
      let bl = hwb[2] / 100;
      const ratio = wh + bl;
      let f;
      if (ratio > 1) {
        wh /= ratio;
        bl /= ratio;
      }
      const i = Math.floor(6 * h);
      const v = 1 - bl;
      f = 6 * h - i;
      if ((i & 1) !== 0) {
        f = 1 - f;
      }
      const n = wh + f * (v - wh);
      let r;
      let g;
      let b;
      switch (i) {
        default:
        case 6:
        case 0:
          r = v;
          g = n;
          b = wh;
          break;
        case 1:
          r = n;
          g = v;
          b = wh;
          break;
        case 2:
          r = wh;
          g = v;
          b = n;
          break;
        case 3:
          r = wh;
          g = n;
          b = v;
          break;
        case 4:
          r = n;
          g = wh;
          b = v;
          break;
        case 5:
          r = v;
          g = wh;
          b = n;
          break;
      }
      return [r * 255, g * 255, b * 255];
    };
    convert.cmyk.rgb = function(cmyk) {
      const c = cmyk[0] / 100;
      const m = cmyk[1] / 100;
      const y = cmyk[2] / 100;
      const k = cmyk[3] / 100;
      const r = 1 - Math.min(1, c * (1 - k) + k);
      const g = 1 - Math.min(1, m * (1 - k) + k);
      const b = 1 - Math.min(1, y * (1 - k) + k);
      return [r * 255, g * 255, b * 255];
    };
    convert.xyz.rgb = function(xyz) {
      const x = xyz[0] / 100;
      const y = xyz[1] / 100;
      const z = xyz[2] / 100;
      let r;
      let g;
      let b;
      r = x * 3.2406 + y * -1.5372 + z * -0.4986;
      g = x * -0.9689 + y * 1.8758 + z * 0.0415;
      b = x * 0.0557 + y * -0.204 + z * 1.057;
      r = r > 31308e-7 ? 1.055 * r ** (1 / 2.4) - 0.055 : r * 12.92;
      g = g > 31308e-7 ? 1.055 * g ** (1 / 2.4) - 0.055 : g * 12.92;
      b = b > 31308e-7 ? 1.055 * b ** (1 / 2.4) - 0.055 : b * 12.92;
      r = Math.min(Math.max(0, r), 1);
      g = Math.min(Math.max(0, g), 1);
      b = Math.min(Math.max(0, b), 1);
      return [r * 255, g * 255, b * 255];
    };
    convert.xyz.lab = function(xyz) {
      let x = xyz[0];
      let y = xyz[1];
      let z = xyz[2];
      x /= 95.047;
      y /= 100;
      z /= 108.883;
      x = x > 8856e-6 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
      y = y > 8856e-6 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
      z = z > 8856e-6 ? z ** (1 / 3) : 7.787 * z + 16 / 116;
      const l = 116 * y - 16;
      const a = 500 * (x - y);
      const b = 200 * (y - z);
      return [l, a, b];
    };
    convert.lab.xyz = function(lab) {
      const l = lab[0];
      const a = lab[1];
      const b = lab[2];
      let x;
      let y;
      let z;
      y = (l + 16) / 116;
      x = a / 500 + y;
      z = y - b / 200;
      const y2 = y ** 3;
      const x2 = x ** 3;
      const z2 = z ** 3;
      y = y2 > 8856e-6 ? y2 : (y - 16 / 116) / 7.787;
      x = x2 > 8856e-6 ? x2 : (x - 16 / 116) / 7.787;
      z = z2 > 8856e-6 ? z2 : (z - 16 / 116) / 7.787;
      x *= 95.047;
      y *= 100;
      z *= 108.883;
      return [x, y, z];
    };
    convert.lab.lch = function(lab) {
      const l = lab[0];
      const a = lab[1];
      const b = lab[2];
      let h;
      const hr = Math.atan2(b, a);
      h = hr * 360 / 2 / Math.PI;
      if (h < 0) {
        h += 360;
      }
      const c = Math.sqrt(a * a + b * b);
      return [l, c, h];
    };
    convert.lch.lab = function(lch) {
      const l = lch[0];
      const c = lch[1];
      const h = lch[2];
      const hr = h / 360 * 2 * Math.PI;
      const a = c * Math.cos(hr);
      const b = c * Math.sin(hr);
      return [l, a, b];
    };
    convert.rgb.ansi16 = function(args, saturation = null) {
      const [r, g, b] = args;
      let value = saturation === null ? convert.rgb.hsv(args)[2] : saturation;
      value = Math.round(value / 50);
      if (value === 0) {
        return 30;
      }
      let ansi = 30 + (Math.round(b / 255) << 2 | Math.round(g / 255) << 1 | Math.round(r / 255));
      if (value === 2) {
        ansi += 60;
      }
      return ansi;
    };
    convert.hsv.ansi16 = function(args) {
      return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
    };
    convert.rgb.ansi256 = function(args) {
      const r = args[0];
      const g = args[1];
      const b = args[2];
      if (r === g && g === b) {
        if (r < 8) {
          return 16;
        }
        if (r > 248) {
          return 231;
        }
        return Math.round((r - 8) / 247 * 24) + 232;
      }
      const ansi = 16 + 36 * Math.round(r / 255 * 5) + 6 * Math.round(g / 255 * 5) + Math.round(b / 255 * 5);
      return ansi;
    };
    convert.ansi16.rgb = function(args) {
      let color = args % 10;
      if (color === 0 || color === 7) {
        if (args > 50) {
          color += 3.5;
        }
        color = color / 10.5 * 255;
        return [color, color, color];
      }
      const mult = (~~(args > 50) + 1) * 0.5;
      const r = (color & 1) * mult * 255;
      const g = (color >> 1 & 1) * mult * 255;
      const b = (color >> 2 & 1) * mult * 255;
      return [r, g, b];
    };
    convert.ansi256.rgb = function(args) {
      if (args >= 232) {
        const c = (args - 232) * 10 + 8;
        return [c, c, c];
      }
      args -= 16;
      let rem;
      const r = Math.floor(args / 36) / 5 * 255;
      const g = Math.floor((rem = args % 36) / 6) / 5 * 255;
      const b = rem % 6 / 5 * 255;
      return [r, g, b];
    };
    convert.rgb.hex = function(args) {
      const integer = ((Math.round(args[0]) & 255) << 16) + ((Math.round(args[1]) & 255) << 8) + (Math.round(args[2]) & 255);
      const string = integer.toString(16).toUpperCase();
      return "000000".substring(string.length) + string;
    };
    convert.hex.rgb = function(args) {
      const match = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
      if (!match) {
        return [0, 0, 0];
      }
      let colorString = match[0];
      if (match[0].length === 3) {
        colorString = colorString.split("").map((char) => {
          return char + char;
        }).join("");
      }
      const integer = parseInt(colorString, 16);
      const r = integer >> 16 & 255;
      const g = integer >> 8 & 255;
      const b = integer & 255;
      return [r, g, b];
    };
    convert.rgb.hcg = function(rgb) {
      const r = rgb[0] / 255;
      const g = rgb[1] / 255;
      const b = rgb[2] / 255;
      const max = Math.max(Math.max(r, g), b);
      const min = Math.min(Math.min(r, g), b);
      const chroma = max - min;
      let grayscale;
      let hue;
      if (chroma < 1) {
        grayscale = min / (1 - chroma);
      } else {
        grayscale = 0;
      }
      if (chroma <= 0) {
        hue = 0;
      } else if (max === r) {
        hue = (g - b) / chroma % 6;
      } else if (max === g) {
        hue = 2 + (b - r) / chroma;
      } else {
        hue = 4 + (r - g) / chroma;
      }
      hue /= 6;
      hue %= 1;
      return [hue * 360, chroma * 100, grayscale * 100];
    };
    convert.hsl.hcg = function(hsl) {
      const s = hsl[1] / 100;
      const l = hsl[2] / 100;
      const c = l < 0.5 ? 2 * s * l : 2 * s * (1 - l);
      let f = 0;
      if (c < 1) {
        f = (l - 0.5 * c) / (1 - c);
      }
      return [hsl[0], c * 100, f * 100];
    };
    convert.hsv.hcg = function(hsv) {
      const s = hsv[1] / 100;
      const v = hsv[2] / 100;
      const c = s * v;
      let f = 0;
      if (c < 1) {
        f = (v - c) / (1 - c);
      }
      return [hsv[0], c * 100, f * 100];
    };
    convert.hcg.rgb = function(hcg) {
      const h = hcg[0] / 360;
      const c = hcg[1] / 100;
      const g = hcg[2] / 100;
      if (c === 0) {
        return [g * 255, g * 255, g * 255];
      }
      const pure = [0, 0, 0];
      const hi = h % 1 * 6;
      const v = hi % 1;
      const w = 1 - v;
      let mg = 0;
      switch (Math.floor(hi)) {
        case 0:
          pure[0] = 1;
          pure[1] = v;
          pure[2] = 0;
          break;
        case 1:
          pure[0] = w;
          pure[1] = 1;
          pure[2] = 0;
          break;
        case 2:
          pure[0] = 0;
          pure[1] = 1;
          pure[2] = v;
          break;
        case 3:
          pure[0] = 0;
          pure[1] = w;
          pure[2] = 1;
          break;
        case 4:
          pure[0] = v;
          pure[1] = 0;
          pure[2] = 1;
          break;
        default:
          pure[0] = 1;
          pure[1] = 0;
          pure[2] = w;
      }
      mg = (1 - c) * g;
      return [
        (c * pure[0] + mg) * 255,
        (c * pure[1] + mg) * 255,
        (c * pure[2] + mg) * 255
      ];
    };
    convert.hcg.hsv = function(hcg) {
      const c = hcg[1] / 100;
      const g = hcg[2] / 100;
      const v = c + g * (1 - c);
      let f = 0;
      if (v > 0) {
        f = c / v;
      }
      return [hcg[0], f * 100, v * 100];
    };
    convert.hcg.hsl = function(hcg) {
      const c = hcg[1] / 100;
      const g = hcg[2] / 100;
      const l = g * (1 - c) + 0.5 * c;
      let s = 0;
      if (l > 0 && l < 0.5) {
        s = c / (2 * l);
      } else if (l >= 0.5 && l < 1) {
        s = c / (2 * (1 - l));
      }
      return [hcg[0], s * 100, l * 100];
    };
    convert.hcg.hwb = function(hcg) {
      const c = hcg[1] / 100;
      const g = hcg[2] / 100;
      const v = c + g * (1 - c);
      return [hcg[0], (v - c) * 100, (1 - v) * 100];
    };
    convert.hwb.hcg = function(hwb) {
      const w = hwb[1] / 100;
      const b = hwb[2] / 100;
      const v = 1 - b;
      const c = v - w;
      let g = 0;
      if (c < 1) {
        g = (v - c) / (1 - c);
      }
      return [hwb[0], c * 100, g * 100];
    };
    convert.apple.rgb = function(apple) {
      return [apple[0] / 65535 * 255, apple[1] / 65535 * 255, apple[2] / 65535 * 255];
    };
    convert.rgb.apple = function(rgb) {
      return [rgb[0] / 255 * 65535, rgb[1] / 255 * 65535, rgb[2] / 255 * 65535];
    };
    convert.gray.rgb = function(args) {
      return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
    };
    convert.gray.hsl = function(args) {
      return [0, 0, args[0]];
    };
    convert.gray.hsv = convert.gray.hsl;
    convert.gray.hwb = function(gray) {
      return [0, 100, gray[0]];
    };
    convert.gray.cmyk = function(gray) {
      return [0, 0, 0, gray[0]];
    };
    convert.gray.lab = function(gray) {
      return [gray[0], 0, 0];
    };
    convert.gray.hex = function(gray) {
      const val = Math.round(gray[0] / 100 * 255) & 255;
      const integer = (val << 16) + (val << 8) + val;
      const string = integer.toString(16).toUpperCase();
      return "000000".substring(string.length) + string;
    };
    convert.rgb.gray = function(rgb) {
      const val = (rgb[0] + rgb[1] + rgb[2]) / 3;
      return [val / 255 * 100];
    };
  }
});

// node_modules/color-convert/route.js
var require_route = __commonJS({
  "node_modules/color-convert/route.js"(exports, module) {
    init_esm();
    var conversions = require_conversions();
    function buildGraph() {
      const graph = {};
      const models = Object.keys(conversions);
      for (let len = models.length, i = 0; i < len; i++) {
        graph[models[i]] = {
          // http://jsperf.com/1-vs-infinity
          // micro-opt, but this is simple.
          distance: -1,
          parent: null
        };
      }
      return graph;
    }
    __name(buildGraph, "buildGraph");
    function deriveBFS(fromModel) {
      const graph = buildGraph();
      const queue = [fromModel];
      graph[fromModel].distance = 0;
      while (queue.length) {
        const current = queue.pop();
        const adjacents = Object.keys(conversions[current]);
        for (let len = adjacents.length, i = 0; i < len; i++) {
          const adjacent = adjacents[i];
          const node = graph[adjacent];
          if (node.distance === -1) {
            node.distance = graph[current].distance + 1;
            node.parent = current;
            queue.unshift(adjacent);
          }
        }
      }
      return graph;
    }
    __name(deriveBFS, "deriveBFS");
    function link(from, to) {
      return function(args) {
        return to(from(args));
      };
    }
    __name(link, "link");
    function wrapConversion(toModel, graph) {
      const path4 = [graph[toModel].parent, toModel];
      let fn = conversions[graph[toModel].parent][toModel];
      let cur = graph[toModel].parent;
      while (graph[cur].parent) {
        path4.unshift(graph[cur].parent);
        fn = link(conversions[graph[cur].parent][cur], fn);
        cur = graph[cur].parent;
      }
      fn.conversion = path4;
      return fn;
    }
    __name(wrapConversion, "wrapConversion");
    module.exports = function(fromModel) {
      const graph = deriveBFS(fromModel);
      const conversion = {};
      const models = Object.keys(graph);
      for (let len = models.length, i = 0; i < len; i++) {
        const toModel = models[i];
        const node = graph[toModel];
        if (node.parent === null) {
          continue;
        }
        conversion[toModel] = wrapConversion(toModel, graph);
      }
      return conversion;
    };
  }
});

// node_modules/color-convert/index.js
var require_color_convert = __commonJS({
  "node_modules/color-convert/index.js"(exports, module) {
    init_esm();
    var conversions = require_conversions();
    var route = require_route();
    var convert = {};
    var models = Object.keys(conversions);
    function wrapRaw(fn) {
      const wrappedFn = /* @__PURE__ */ __name(function(...args) {
        const arg0 = args[0];
        if (arg0 === void 0 || arg0 === null) {
          return arg0;
        }
        if (arg0.length > 1) {
          args = arg0;
        }
        return fn(args);
      }, "wrappedFn");
      if ("conversion" in fn) {
        wrappedFn.conversion = fn.conversion;
      }
      return wrappedFn;
    }
    __name(wrapRaw, "wrapRaw");
    function wrapRounded(fn) {
      const wrappedFn = /* @__PURE__ */ __name(function(...args) {
        const arg0 = args[0];
        if (arg0 === void 0 || arg0 === null) {
          return arg0;
        }
        if (arg0.length > 1) {
          args = arg0;
        }
        const result = fn(args);
        if (typeof result === "object") {
          for (let len = result.length, i = 0; i < len; i++) {
            result[i] = Math.round(result[i]);
          }
        }
        return result;
      }, "wrappedFn");
      if ("conversion" in fn) {
        wrappedFn.conversion = fn.conversion;
      }
      return wrappedFn;
    }
    __name(wrapRounded, "wrapRounded");
    models.forEach((fromModel) => {
      convert[fromModel] = {};
      Object.defineProperty(convert[fromModel], "channels", { value: conversions[fromModel].channels });
      Object.defineProperty(convert[fromModel], "labels", { value: conversions[fromModel].labels });
      const routes = route(fromModel);
      const routeModels = Object.keys(routes);
      routeModels.forEach((toModel) => {
        const fn = routes[toModel];
        convert[fromModel][toModel] = wrapRounded(fn);
        convert[fromModel][toModel].raw = wrapRaw(fn);
      });
    });
    module.exports = convert;
  }
});

// node_modules/ansi-styles/index.js
var require_ansi_styles = __commonJS({
  "node_modules/ansi-styles/index.js"(exports, module) {
    "use strict";
    init_esm();
    var wrapAnsi16 = /* @__PURE__ */ __name((fn, offset) => (...args) => {
      const code = fn(...args);
      return `\x1B[${code + offset}m`;
    }, "wrapAnsi16");
    var wrapAnsi256 = /* @__PURE__ */ __name((fn, offset) => (...args) => {
      const code = fn(...args);
      return `\x1B[${38 + offset};5;${code}m`;
    }, "wrapAnsi256");
    var wrapAnsi16m = /* @__PURE__ */ __name((fn, offset) => (...args) => {
      const rgb = fn(...args);
      return `\x1B[${38 + offset};2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
    }, "wrapAnsi16m");
    var ansi2ansi = /* @__PURE__ */ __name((n) => n, "ansi2ansi");
    var rgb2rgb = /* @__PURE__ */ __name((r, g, b) => [r, g, b], "rgb2rgb");
    var setLazyProperty = /* @__PURE__ */ __name((object, property, get) => {
      Object.defineProperty(object, property, {
        get: /* @__PURE__ */ __name(() => {
          const value = get();
          Object.defineProperty(object, property, {
            value,
            enumerable: true,
            configurable: true
          });
          return value;
        }, "get"),
        enumerable: true,
        configurable: true
      });
    }, "setLazyProperty");
    var colorConvert;
    var makeDynamicStyles = /* @__PURE__ */ __name((wrap, targetSpace, identity, isBackground) => {
      if (colorConvert === void 0) {
        colorConvert = require_color_convert();
      }
      const offset = isBackground ? 10 : 0;
      const styles = {};
      for (const [sourceSpace, suite] of Object.entries(colorConvert)) {
        const name = sourceSpace === "ansi16" ? "ansi" : sourceSpace;
        if (sourceSpace === targetSpace) {
          styles[name] = wrap(identity, offset);
        } else if (typeof suite === "object") {
          styles[name] = wrap(suite[targetSpace], offset);
        }
      }
      return styles;
    }, "makeDynamicStyles");
    function assembleStyles() {
      const codes = /* @__PURE__ */ new Map();
      const styles = {
        modifier: {
          reset: [0, 0],
          // 21 isn't widely supported and 22 does the same thing
          bold: [1, 22],
          dim: [2, 22],
          italic: [3, 23],
          underline: [4, 24],
          inverse: [7, 27],
          hidden: [8, 28],
          strikethrough: [9, 29]
        },
        color: {
          black: [30, 39],
          red: [31, 39],
          green: [32, 39],
          yellow: [33, 39],
          blue: [34, 39],
          magenta: [35, 39],
          cyan: [36, 39],
          white: [37, 39],
          // Bright color
          blackBright: [90, 39],
          redBright: [91, 39],
          greenBright: [92, 39],
          yellowBright: [93, 39],
          blueBright: [94, 39],
          magentaBright: [95, 39],
          cyanBright: [96, 39],
          whiteBright: [97, 39]
        },
        bgColor: {
          bgBlack: [40, 49],
          bgRed: [41, 49],
          bgGreen: [42, 49],
          bgYellow: [43, 49],
          bgBlue: [44, 49],
          bgMagenta: [45, 49],
          bgCyan: [46, 49],
          bgWhite: [47, 49],
          // Bright color
          bgBlackBright: [100, 49],
          bgRedBright: [101, 49],
          bgGreenBright: [102, 49],
          bgYellowBright: [103, 49],
          bgBlueBright: [104, 49],
          bgMagentaBright: [105, 49],
          bgCyanBright: [106, 49],
          bgWhiteBright: [107, 49]
        }
      };
      styles.color.gray = styles.color.blackBright;
      styles.bgColor.bgGray = styles.bgColor.bgBlackBright;
      styles.color.grey = styles.color.blackBright;
      styles.bgColor.bgGrey = styles.bgColor.bgBlackBright;
      for (const [groupName, group] of Object.entries(styles)) {
        for (const [styleName, style] of Object.entries(group)) {
          styles[styleName] = {
            open: `\x1B[${style[0]}m`,
            close: `\x1B[${style[1]}m`
          };
          group[styleName] = styles[styleName];
          codes.set(style[0], style[1]);
        }
        Object.defineProperty(styles, groupName, {
          value: group,
          enumerable: false
        });
      }
      Object.defineProperty(styles, "codes", {
        value: codes,
        enumerable: false
      });
      styles.color.close = "\x1B[39m";
      styles.bgColor.close = "\x1B[49m";
      setLazyProperty(styles.color, "ansi", () => makeDynamicStyles(wrapAnsi16, "ansi16", ansi2ansi, false));
      setLazyProperty(styles.color, "ansi256", () => makeDynamicStyles(wrapAnsi256, "ansi256", ansi2ansi, false));
      setLazyProperty(styles.color, "ansi16m", () => makeDynamicStyles(wrapAnsi16m, "rgb", rgb2rgb, false));
      setLazyProperty(styles.bgColor, "ansi", () => makeDynamicStyles(wrapAnsi16, "ansi16", ansi2ansi, true));
      setLazyProperty(styles.bgColor, "ansi256", () => makeDynamicStyles(wrapAnsi256, "ansi256", ansi2ansi, true));
      setLazyProperty(styles.bgColor, "ansi16m", () => makeDynamicStyles(wrapAnsi16m, "rgb", rgb2rgb, true));
      return styles;
    }
    __name(assembleStyles, "assembleStyles");
    Object.defineProperty(module, "exports", {
      enumerable: true,
      get: assembleStyles
    });
  }
});

// node_modules/has-flag/index.js
var require_has_flag = __commonJS({
  "node_modules/has-flag/index.js"(exports, module) {
    "use strict";
    init_esm();
    module.exports = (flag, argv = process.argv) => {
      const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
      const position = argv.indexOf(prefix + flag);
      const terminatorPosition = argv.indexOf("--");
      return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
    };
  }
});

// node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "node_modules/supports-color/index.js"(exports, module) {
    "use strict";
    init_esm();
    var os2 = __require("os");
    var tty = __require("tty");
    var hasFlag = require_has_flag();
    var { env } = process;
    var forceColor;
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
      forceColor = 0;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      forceColor = 1;
    }
    if ("FORCE_COLOR" in env) {
      if (env.FORCE_COLOR === "true") {
        forceColor = 1;
      } else if (env.FORCE_COLOR === "false") {
        forceColor = 0;
      } else {
        forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
      }
    }
    function translateLevel(level) {
      if (level === 0) {
        return false;
      }
      return {
        level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3
      };
    }
    __name(translateLevel, "translateLevel");
    function supportsColor(haveStream, streamIsTTY) {
      if (forceColor === 0) {
        return 0;
      }
      if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
        return 3;
      }
      if (hasFlag("color=256")) {
        return 2;
      }
      if (haveStream && !streamIsTTY && forceColor === void 0) {
        return 0;
      }
      const min = forceColor || 0;
      if (env.TERM === "dumb") {
        return min;
      }
      if (process.platform === "win32") {
        const osRelease = os2.release().split(".");
        if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
          return Number(osRelease[2]) >= 14931 ? 3 : 2;
        }
        return 1;
      }
      if ("CI" in env) {
        if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
          return 1;
        }
        return min;
      }
      if ("TEAMCITY_VERSION" in env) {
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
      }
      if (env.COLORTERM === "truecolor") {
        return 3;
      }
      if ("TERM_PROGRAM" in env) {
        const version2 = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
        switch (env.TERM_PROGRAM) {
          case "iTerm.app":
            return version2 >= 3 ? 3 : 2;
          case "Apple_Terminal":
            return 2;
        }
      }
      if (/-256(color)?$/i.test(env.TERM)) {
        return 2;
      }
      if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
        return 1;
      }
      if ("COLORTERM" in env) {
        return 1;
      }
      return min;
    }
    __name(supportsColor, "supportsColor");
    function getSupportLevel(stream) {
      const level = supportsColor(stream, stream && stream.isTTY);
      return translateLevel(level);
    }
    __name(getSupportLevel, "getSupportLevel");
    module.exports = {
      supportsColor: getSupportLevel,
      stdout: translateLevel(supportsColor(true, tty.isatty(1))),
      stderr: translateLevel(supportsColor(true, tty.isatty(2)))
    };
  }
});

// node_modules/chalk/source/util.js
var require_util = __commonJS({
  "node_modules/chalk/source/util.js"(exports, module) {
    "use strict";
    init_esm();
    var stringReplaceAll = /* @__PURE__ */ __name((string, substring, replacer) => {
      let index = string.indexOf(substring);
      if (index === -1) {
        return string;
      }
      const substringLength = substring.length;
      let endIndex = 0;
      let returnValue = "";
      do {
        returnValue += string.substr(endIndex, index - endIndex) + substring + replacer;
        endIndex = index + substringLength;
        index = string.indexOf(substring, endIndex);
      } while (index !== -1);
      returnValue += string.substr(endIndex);
      return returnValue;
    }, "stringReplaceAll");
    var stringEncaseCRLFWithFirstIndex = /* @__PURE__ */ __name((string, prefix, postfix, index) => {
      let endIndex = 0;
      let returnValue = "";
      do {
        const gotCR = string[index - 1] === "\r";
        returnValue += string.substr(endIndex, (gotCR ? index - 1 : index) - endIndex) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
        endIndex = index + 1;
        index = string.indexOf("\n", endIndex);
      } while (index !== -1);
      returnValue += string.substr(endIndex);
      return returnValue;
    }, "stringEncaseCRLFWithFirstIndex");
    module.exports = {
      stringReplaceAll,
      stringEncaseCRLFWithFirstIndex
    };
  }
});

// node_modules/chalk/source/templates.js
var require_templates = __commonJS({
  "node_modules/chalk/source/templates.js"(exports, module) {
    "use strict";
    init_esm();
    var TEMPLATE_REGEX = /(?:\\(u(?:[a-f\d]{4}|\{[a-f\d]{1,6}\})|x[a-f\d]{2}|.))|(?:\{(~)?(\w+(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?)*)(?:[ \t]|(?=\r?\n)))|(\})|((?:.|[\r\n\f])+?)/gi;
    var STYLE_REGEX = /(?:^|\.)(\w+)(?:\(([^)]*)\))?/g;
    var STRING_REGEX = /^(['"])((?:\\.|(?!\1)[^\\])*)\1$/;
    var ESCAPE_REGEX = /\\(u(?:[a-f\d]{4}|{[a-f\d]{1,6}})|x[a-f\d]{2}|.)|([^\\])/gi;
    var ESCAPES = /* @__PURE__ */ new Map([
      ["n", "\n"],
      ["r", "\r"],
      ["t", "	"],
      ["b", "\b"],
      ["f", "\f"],
      ["v", "\v"],
      ["0", "\0"],
      ["\\", "\\"],
      ["e", "\x1B"],
      ["a", "\x07"]
    ]);
    function unescape2(c) {
      const u = c[0] === "u";
      const bracket = c[1] === "{";
      if (u && !bracket && c.length === 5 || c[0] === "x" && c.length === 3) {
        return String.fromCharCode(parseInt(c.slice(1), 16));
      }
      if (u && bracket) {
        return String.fromCodePoint(parseInt(c.slice(2, -1), 16));
      }
      return ESCAPES.get(c) || c;
    }
    __name(unescape2, "unescape");
    function parseArguments(name, arguments_) {
      const results = [];
      const chunks = arguments_.trim().split(/\s*,\s*/g);
      let matches;
      for (const chunk of chunks) {
        const number = Number(chunk);
        if (!Number.isNaN(number)) {
          results.push(number);
        } else if (matches = chunk.match(STRING_REGEX)) {
          results.push(matches[2].replace(ESCAPE_REGEX, (m, escape2, character) => escape2 ? unescape2(escape2) : character));
        } else {
          throw new Error(`Invalid Chalk template style argument: ${chunk} (in style '${name}')`);
        }
      }
      return results;
    }
    __name(parseArguments, "parseArguments");
    function parseStyle(style) {
      STYLE_REGEX.lastIndex = 0;
      const results = [];
      let matches;
      while ((matches = STYLE_REGEX.exec(style)) !== null) {
        const name = matches[1];
        if (matches[2]) {
          const args = parseArguments(name, matches[2]);
          results.push([name].concat(args));
        } else {
          results.push([name]);
        }
      }
      return results;
    }
    __name(parseStyle, "parseStyle");
    function buildStyle(chalk2, styles) {
      const enabled = {};
      for (const layer of styles) {
        for (const style of layer.styles) {
          enabled[style[0]] = layer.inverse ? null : style.slice(1);
        }
      }
      let current = chalk2;
      for (const [styleName, styles2] of Object.entries(enabled)) {
        if (!Array.isArray(styles2)) {
          continue;
        }
        if (!(styleName in current)) {
          throw new Error(`Unknown Chalk style: ${styleName}`);
        }
        current = styles2.length > 0 ? current[styleName](...styles2) : current[styleName];
      }
      return current;
    }
    __name(buildStyle, "buildStyle");
    module.exports = (chalk2, temporary) => {
      const styles = [];
      const chunks = [];
      let chunk = [];
      temporary.replace(TEMPLATE_REGEX, (m, escapeCharacter, inverse, style, close, character) => {
        if (escapeCharacter) {
          chunk.push(unescape2(escapeCharacter));
        } else if (style) {
          const string = chunk.join("");
          chunk = [];
          chunks.push(styles.length === 0 ? string : buildStyle(chalk2, styles)(string));
          styles.push({ inverse, styles: parseStyle(style) });
        } else if (close) {
          if (styles.length === 0) {
            throw new Error("Found extraneous } in Chalk template literal");
          }
          chunks.push(buildStyle(chalk2, styles)(chunk.join("")));
          chunk = [];
          styles.pop();
        } else {
          chunk.push(character);
        }
      });
      chunks.push(chunk.join(""));
      if (styles.length > 0) {
        const errMessage = `Chalk template literal is missing ${styles.length} closing bracket${styles.length === 1 ? "" : "s"} (\`}\`)`;
        throw new Error(errMessage);
      }
      return chunks.join("");
    };
  }
});

// node_modules/chalk/source/index.js
var require_source = __commonJS({
  "node_modules/chalk/source/index.js"(exports, module) {
    "use strict";
    init_esm();
    var ansiStyles = require_ansi_styles();
    var { stdout: stdoutColor, stderr: stderrColor } = require_supports_color();
    var {
      stringReplaceAll,
      stringEncaseCRLFWithFirstIndex
    } = require_util();
    var { isArray: isArray3 } = Array;
    var levelMapping = [
      "ansi",
      "ansi",
      "ansi256",
      "ansi16m"
    ];
    var styles = /* @__PURE__ */ Object.create(null);
    var applyOptions = /* @__PURE__ */ __name((object, options = {}) => {
      if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
        throw new Error("The `level` option should be an integer from 0 to 3");
      }
      const colorLevel = stdoutColor ? stdoutColor.level : 0;
      object.level = options.level === void 0 ? colorLevel : options.level;
    }, "applyOptions");
    var ChalkClass = class {
      static {
        __name(this, "ChalkClass");
      }
      constructor(options) {
        return chalkFactory(options);
      }
    };
    var chalkFactory = /* @__PURE__ */ __name((options) => {
      const chalk3 = {};
      applyOptions(chalk3, options);
      chalk3.template = (...arguments_) => chalkTag(chalk3.template, ...arguments_);
      Object.setPrototypeOf(chalk3, Chalk.prototype);
      Object.setPrototypeOf(chalk3.template, chalk3);
      chalk3.template.constructor = () => {
        throw new Error("`chalk.constructor()` is deprecated. Use `new chalk.Instance()` instead.");
      };
      chalk3.template.Instance = ChalkClass;
      return chalk3.template;
    }, "chalkFactory");
    function Chalk(options) {
      return chalkFactory(options);
    }
    __name(Chalk, "Chalk");
    for (const [styleName, style] of Object.entries(ansiStyles)) {
      styles[styleName] = {
        get() {
          const builder = createBuilder(this, createStyler(style.open, style.close, this._styler), this._isEmpty);
          Object.defineProperty(this, styleName, { value: builder });
          return builder;
        }
      };
    }
    styles.visible = {
      get() {
        const builder = createBuilder(this, this._styler, true);
        Object.defineProperty(this, "visible", { value: builder });
        return builder;
      }
    };
    var usedModels = ["rgb", "hex", "keyword", "hsl", "hsv", "hwb", "ansi", "ansi256"];
    for (const model of usedModels) {
      styles[model] = {
        get() {
          const { level } = this;
          return function(...arguments_) {
            const styler = createStyler(ansiStyles.color[levelMapping[level]][model](...arguments_), ansiStyles.color.close, this._styler);
            return createBuilder(this, styler, this._isEmpty);
          };
        }
      };
    }
    for (const model of usedModels) {
      const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
      styles[bgModel] = {
        get() {
          const { level } = this;
          return function(...arguments_) {
            const styler = createStyler(ansiStyles.bgColor[levelMapping[level]][model](...arguments_), ansiStyles.bgColor.close, this._styler);
            return createBuilder(this, styler, this._isEmpty);
          };
        }
      };
    }
    var proto = Object.defineProperties(() => {
    }, {
      ...styles,
      level: {
        enumerable: true,
        get() {
          return this._generator.level;
        },
        set(level) {
          this._generator.level = level;
        }
      }
    });
    var createStyler = /* @__PURE__ */ __name((open, close, parent) => {
      let openAll;
      let closeAll;
      if (parent === void 0) {
        openAll = open;
        closeAll = close;
      } else {
        openAll = parent.openAll + open;
        closeAll = close + parent.closeAll;
      }
      return {
        open,
        close,
        openAll,
        closeAll,
        parent
      };
    }, "createStyler");
    var createBuilder = /* @__PURE__ */ __name((self, _styler, _isEmpty) => {
      const builder = /* @__PURE__ */ __name((...arguments_) => {
        if (isArray3(arguments_[0]) && isArray3(arguments_[0].raw)) {
          return applyStyle(builder, chalkTag(builder, ...arguments_));
        }
        return applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
      }, "builder");
      Object.setPrototypeOf(builder, proto);
      builder._generator = self;
      builder._styler = _styler;
      builder._isEmpty = _isEmpty;
      return builder;
    }, "createBuilder");
    var applyStyle = /* @__PURE__ */ __name((self, string) => {
      if (self.level <= 0 || !string) {
        return self._isEmpty ? "" : string;
      }
      let styler = self._styler;
      if (styler === void 0) {
        return string;
      }
      const { openAll, closeAll } = styler;
      if (string.indexOf("\x1B") !== -1) {
        while (styler !== void 0) {
          string = stringReplaceAll(string, styler.close, styler.open);
          styler = styler.parent;
        }
      }
      const lfIndex = string.indexOf("\n");
      if (lfIndex !== -1) {
        string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
      }
      return openAll + string + closeAll;
    }, "applyStyle");
    var template;
    var chalkTag = /* @__PURE__ */ __name((chalk3, ...strings) => {
      const [firstString] = strings;
      if (!isArray3(firstString) || !isArray3(firstString.raw)) {
        return strings.join(" ");
      }
      const arguments_ = strings.slice(1);
      const parts = [firstString.raw[0]];
      for (let i = 1; i < firstString.length; i++) {
        parts.push(
          String(arguments_[i - 1]).replace(/[{}\\]/g, "\\$&"),
          String(firstString.raw[i])
        );
      }
      if (template === void 0) {
        template = require_templates();
      }
      return template(chalk3, parts.join(""));
    }, "chalkTag");
    Object.defineProperties(Chalk.prototype, styles);
    var chalk2 = Chalk();
    chalk2.supportsColor = stdoutColor;
    chalk2.stderr = Chalk({ level: stderrColor ? stderrColor.level : 0 });
    chalk2.stderr.supportsColor = stderrColor;
    module.exports = chalk2;
  }
});

// node_modules/@composio/core/node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/@composio/core/node_modules/semver/internal/constants.js"(exports, module) {
    "use strict";
    init_esm();
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/@composio/core/node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/@composio/core/node_modules/semver/internal/debug.js"(exports, module) {
    "use strict";
    init_esm();
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module.exports = debug;
  }
});

// node_modules/@composio/core/node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/@composio/core/node_modules/semver/internal/re.js"(exports, module) {
    "use strict";
    init_esm();
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports = module.exports = {};
    var re = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var safeSrc = exports.safeSrc = [];
    var t = exports.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = /* @__PURE__ */ __name((value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    }, "makeSafeRegex");
    var createToken = /* @__PURE__ */ __name((name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    }, "createToken");
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/@composio/core/node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/@composio/core/node_modules/semver/internal/parse-options.js"(exports, module) {
    "use strict";
    init_esm();
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = /* @__PURE__ */ __name((options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    }, "parseOptions");
    module.exports = parseOptions;
  }
});

// node_modules/@composio/core/node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/@composio/core/node_modules/semver/internal/identifiers.js"(exports, module) {
    "use strict";
    init_esm();
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = /* @__PURE__ */ __name((a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    }, "compareIdentifiers");
    var rcompareIdentifiers = /* @__PURE__ */ __name((a, b) => compareIdentifiers(b, a), "rcompareIdentifiers");
    module.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/@composio/core/node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/@composio/core/node_modules/semver/classes/semver.js"(exports, module) {
    "use strict";
    init_esm();
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class _SemVer {
      static {
        __name(this, "SemVer");
      }
      constructor(version2, options) {
        options = parseOptions(options);
        if (version2 instanceof _SemVer) {
          if (version2.loose === !!options.loose && version2.includePrerelease === !!options.includePrerelease) {
            return version2;
          } else {
            version2 = version2.version;
          }
        } else if (typeof version2 !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version2}".`);
        }
        if (version2.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version2, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version2.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version2}`);
        }
        this.raw = version2;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module.exports = SemVer;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/parse.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var parse = /* @__PURE__ */ __name((version2, options, throwErrors = false) => {
      if (version2 instanceof SemVer) {
        return version2;
      }
      try {
        return new SemVer(version2, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    }, "parse");
    module.exports = parse;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/valid.js"(exports, module) {
    "use strict";
    init_esm();
    var parse = require_parse();
    var valid = /* @__PURE__ */ __name((version2, options) => {
      const v = parse(version2, options);
      return v ? v.version : null;
    }, "valid");
    module.exports = valid;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/clean.js"(exports, module) {
    "use strict";
    init_esm();
    var parse = require_parse();
    var clean = /* @__PURE__ */ __name((version2, options) => {
      const s = parse(version2.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    }, "clean");
    module.exports = clean;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/inc.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var inc = /* @__PURE__ */ __name((version2, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version2 instanceof SemVer ? version2.version : version2,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    }, "inc");
    module.exports = inc;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/diff.js"(exports, module) {
    "use strict";
    init_esm();
    var parse = require_parse();
    var diff = /* @__PURE__ */ __name((version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    }, "diff");
    module.exports = diff;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/major.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var major = /* @__PURE__ */ __name((a, loose) => new SemVer(a, loose).major, "major");
    module.exports = major;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/minor.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var minor = /* @__PURE__ */ __name((a, loose) => new SemVer(a, loose).minor, "minor");
    module.exports = minor;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/patch.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var patch = /* @__PURE__ */ __name((a, loose) => new SemVer(a, loose).patch, "patch");
    module.exports = patch;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/prerelease.js"(exports, module) {
    "use strict";
    init_esm();
    var parse = require_parse();
    var prerelease = /* @__PURE__ */ __name((version2, options) => {
      const parsed = parse(version2, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    }, "prerelease");
    module.exports = prerelease;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/compare.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var compare = /* @__PURE__ */ __name((a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose)), "compare");
    module.exports = compare;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/rcompare.js"(exports, module) {
    "use strict";
    init_esm();
    var compare = require_compare();
    var rcompare = /* @__PURE__ */ __name((a, b, loose) => compare(b, a, loose), "rcompare");
    module.exports = rcompare;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/compare-loose.js"(exports, module) {
    "use strict";
    init_esm();
    var compare = require_compare();
    var compareLoose = /* @__PURE__ */ __name((a, b) => compare(a, b, true), "compareLoose");
    module.exports = compareLoose;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/compare-build.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var compareBuild = /* @__PURE__ */ __name((a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    }, "compareBuild");
    module.exports = compareBuild;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/sort.js"(exports, module) {
    "use strict";
    init_esm();
    var compareBuild = require_compare_build();
    var sort = /* @__PURE__ */ __name((list, loose) => list.sort((a, b) => compareBuild(a, b, loose)), "sort");
    module.exports = sort;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/rsort.js"(exports, module) {
    "use strict";
    init_esm();
    var compareBuild = require_compare_build();
    var rsort = /* @__PURE__ */ __name((list, loose) => list.sort((a, b) => compareBuild(b, a, loose)), "rsort");
    module.exports = rsort;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/gt.js"(exports, module) {
    "use strict";
    init_esm();
    var compare = require_compare();
    var gt = /* @__PURE__ */ __name((a, b, loose) => compare(a, b, loose) > 0, "gt");
    module.exports = gt;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/lt.js"(exports, module) {
    "use strict";
    init_esm();
    var compare = require_compare();
    var lt = /* @__PURE__ */ __name((a, b, loose) => compare(a, b, loose) < 0, "lt");
    module.exports = lt;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/eq.js"(exports, module) {
    "use strict";
    init_esm();
    var compare = require_compare();
    var eq = /* @__PURE__ */ __name((a, b, loose) => compare(a, b, loose) === 0, "eq");
    module.exports = eq;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/neq.js"(exports, module) {
    "use strict";
    init_esm();
    var compare = require_compare();
    var neq = /* @__PURE__ */ __name((a, b, loose) => compare(a, b, loose) !== 0, "neq");
    module.exports = neq;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/gte.js"(exports, module) {
    "use strict";
    init_esm();
    var compare = require_compare();
    var gte = /* @__PURE__ */ __name((a, b, loose) => compare(a, b, loose) >= 0, "gte");
    module.exports = gte;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/lte.js"(exports, module) {
    "use strict";
    init_esm();
    var compare = require_compare();
    var lte = /* @__PURE__ */ __name((a, b, loose) => compare(a, b, loose) <= 0, "lte");
    module.exports = lte;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/cmp.js"(exports, module) {
    "use strict";
    init_esm();
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = /* @__PURE__ */ __name((a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    }, "cmp");
    module.exports = cmp;
  }
});

// node_modules/@composio/core/node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/coerce.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = /* @__PURE__ */ __name((version2, options) => {
      if (version2 instanceof SemVer) {
        return version2;
      }
      if (typeof version2 === "number") {
        version2 = String(version2);
      }
      if (typeof version2 !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version2.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version2)) && (!match || match.index + match[0].length !== version2.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    }, "coerce");
    module.exports = coerce;
  }
});

// node_modules/@composio/core/node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/@composio/core/node_modules/semver/internal/lrucache.js"(exports, module) {
    "use strict";
    init_esm();
    var LRUCache = class {
      static {
        __name(this, "LRUCache");
      }
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module.exports = LRUCache;
  }
});

// node_modules/@composio/core/node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/@composio/core/node_modules/semver/classes/range.js"(exports, module) {
    "use strict";
    init_esm();
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      static {
        __name(this, "Range");
      }
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version2) {
        if (!version2) {
          return false;
        }
        if (typeof version2 === "string") {
          try {
            version2 = new SemVer(version2, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version2, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var isNullSet = /* @__PURE__ */ __name((c) => c.value === "<0.0.0-0", "isNullSet");
    var isAny = /* @__PURE__ */ __name((c) => c.value === "", "isAny");
    var isSatisfiable = /* @__PURE__ */ __name((comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    }, "isSatisfiable");
    var parseComparator = /* @__PURE__ */ __name((comp, options) => {
      comp = comp.replace(re[t.BUILD], "");
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    }, "parseComparator");
    var isX = /* @__PURE__ */ __name((id) => !id || id.toLowerCase() === "x" || id === "*", "isX");
    var replaceTildes = /* @__PURE__ */ __name((comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    }, "replaceTildes");
    var replaceTilde = /* @__PURE__ */ __name((comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    }, "replaceTilde");
    var replaceCarets = /* @__PURE__ */ __name((comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    }, "replaceCarets");
    var replaceCaret = /* @__PURE__ */ __name((comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    }, "replaceCaret");
    var replaceXRanges = /* @__PURE__ */ __name((comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    }, "replaceXRanges");
    var replaceXRange = /* @__PURE__ */ __name((comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    }, "replaceXRange");
    var replaceStars = /* @__PURE__ */ __name((comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    }, "replaceStars");
    var replaceGTE0 = /* @__PURE__ */ __name((comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    }, "replaceGTE0");
    var hyphenReplace = /* @__PURE__ */ __name((incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    }, "hyphenReplace");
    var testSet = /* @__PURE__ */ __name((set, version2, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version2)) {
          return false;
        }
      }
      if (version2.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version2.major && allowed.minor === version2.minor && allowed.patch === version2.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    }, "testSet");
  }
});

// node_modules/@composio/core/node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/@composio/core/node_modules/semver/classes/comparator.js"(exports, module) {
    "use strict";
    init_esm();
    var ANY = Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static {
        __name(this, "Comparator");
      }
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version2) {
        debug("Comparator.test", version2, this.options.loose);
        if (this.semver === ANY || version2 === ANY) {
          return true;
        }
        if (typeof version2 === "string") {
          try {
            version2 = new SemVer(version2, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version2, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/@composio/core/node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/@composio/core/node_modules/semver/functions/satisfies.js"(exports, module) {
    "use strict";
    init_esm();
    var Range = require_range();
    var satisfies = /* @__PURE__ */ __name((version2, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version2);
    }, "satisfies");
    module.exports = satisfies;
  }
});

// node_modules/@composio/core/node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/@composio/core/node_modules/semver/ranges/to-comparators.js"(exports, module) {
    "use strict";
    init_esm();
    var Range = require_range();
    var toComparators = /* @__PURE__ */ __name((range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" ")), "toComparators");
    module.exports = toComparators;
  }
});

// node_modules/@composio/core/node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/@composio/core/node_modules/semver/ranges/max-satisfying.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = /* @__PURE__ */ __name((versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    }, "maxSatisfying");
    module.exports = maxSatisfying;
  }
});

// node_modules/@composio/core/node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/@composio/core/node_modules/semver/ranges/min-satisfying.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = /* @__PURE__ */ __name((versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    }, "minSatisfying");
    module.exports = minSatisfying;
  }
});

// node_modules/@composio/core/node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/@composio/core/node_modules/semver/ranges/min-version.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = /* @__PURE__ */ __name((range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    }, "minVersion");
    module.exports = minVersion;
  }
});

// node_modules/@composio/core/node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/@composio/core/node_modules/semver/ranges/valid.js"(exports, module) {
    "use strict";
    init_esm();
    var Range = require_range();
    var validRange = /* @__PURE__ */ __name((range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    }, "validRange");
    module.exports = validRange;
  }
});

// node_modules/@composio/core/node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/@composio/core/node_modules/semver/ranges/outside.js"(exports, module) {
    "use strict";
    init_esm();
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = /* @__PURE__ */ __name((version2, range, hilo, options) => {
      version2 = new SemVer(version2, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version2, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version2, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version2, low.semver)) {
          return false;
        }
      }
      return true;
    }, "outside");
    module.exports = outside;
  }
});

// node_modules/@composio/core/node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/@composio/core/node_modules/semver/ranges/gtr.js"(exports, module) {
    "use strict";
    init_esm();
    var outside = require_outside();
    var gtr = /* @__PURE__ */ __name((version2, range, options) => outside(version2, range, ">", options), "gtr");
    module.exports = gtr;
  }
});

// node_modules/@composio/core/node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/@composio/core/node_modules/semver/ranges/ltr.js"(exports, module) {
    "use strict";
    init_esm();
    var outside = require_outside();
    var ltr = /* @__PURE__ */ __name((version2, range, options) => outside(version2, range, "<", options), "ltr");
    module.exports = ltr;
  }
});

// node_modules/@composio/core/node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/@composio/core/node_modules/semver/ranges/intersects.js"(exports, module) {
    "use strict";
    init_esm();
    var Range = require_range();
    var intersects = /* @__PURE__ */ __name((r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    }, "intersects");
    module.exports = intersects;
  }
});

// node_modules/@composio/core/node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/@composio/core/node_modules/semver/ranges/simplify.js"(exports, module) {
    "use strict";
    init_esm();
    var satisfies = require_satisfies();
    var compare = require_compare();
    module.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare(a, b, options));
      for (const version2 of v) {
        const included = satisfies(version2, range, options);
        if (included) {
          prev = version2;
          if (!first) {
            first = version2;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/@composio/core/node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/@composio/core/node_modules/semver/ranges/subset.js"(exports, module) {
    "use strict";
    init_esm();
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = /* @__PURE__ */ __name((sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    }, "subset");
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = /* @__PURE__ */ __name((sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    }, "simpleSubset");
    var higherGT = /* @__PURE__ */ __name((a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    }, "higherGT");
    var lowerLT = /* @__PURE__ */ __name((a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    }, "lowerLT");
    module.exports = subset;
  }
});

// node_modules/@composio/core/node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/@composio/core/node_modules/semver/index.js"(exports, module) {
    "use strict";
    init_esm();
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// node_modules/@composio/core/dist/index.mjs
init_esm();

// node_modules/@composio/core/dist/chunk-Dx2NuYGI.mjs
init_esm();
var __defProp = Object.defineProperty;
var __exportAll = /* @__PURE__ */ __name((all, symbols) => {
  let target = {};
  for (var name in all) {
    __defProp(target, name, {
      get: all[name],
      enumerable: true
    });
  }
  if (symbols) {
    __defProp(target, Symbol.toStringTag, { value: "Module" });
  }
  return target;
}, "__exportAll");

// node_modules/@composio/core/dist/buffer-BFpVRahf.mjs
init_esm();

// node_modules/@composio/client/index.mjs
init_esm();

// node_modules/@composio/client/client.mjs
init_esm();

// node_modules/@composio/client/internal/tslib.mjs
init_esm();
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
__name(__classPrivateFieldSet, "__classPrivateFieldSet");
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
__name(__classPrivateFieldGet, "__classPrivateFieldGet");

// node_modules/@composio/client/internal/utils/uuid.mjs
init_esm();
var uuid4 = /* @__PURE__ */ __name(function() {
  const { crypto: crypto3 } = globalThis;
  if (crypto3?.randomUUID) {
    uuid4 = crypto3.randomUUID.bind(crypto3);
    return crypto3.randomUUID();
  }
  const u8 = new Uint8Array(1);
  const randomByte = crypto3 ? () => crypto3.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
}, "uuid4");

// node_modules/@composio/client/internal/utils/values.mjs
init_esm();

// node_modules/@composio/client/core/error.mjs
init_esm();

// node_modules/@composio/client/internal/errors.mjs
init_esm();
function isAbortError(err) {
  return typeof err === "object" && err !== null && // Spec-compliant fetch implementations
  ("name" in err && err.name === "AbortError" || // Expo fetch
  "message" in err && String(err.message).includes("FetchRequestCanceledException"));
}
__name(isAbortError, "isAbortError");
var castToError = /* @__PURE__ */ __name((err) => {
  if (err instanceof Error)
    return err;
  if (typeof err === "object" && err !== null) {
    try {
      if (Object.prototype.toString.call(err) === "[object Error]") {
        const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
        if (err.stack)
          error.stack = err.stack;
        if (err.cause && !error.cause)
          error.cause = err.cause;
        if (err.name)
          error.name = err.name;
        return error;
      }
    } catch {
    }
    try {
      return new Error(JSON.stringify(err));
    } catch {
    }
  }
  return new Error(err);
}, "castToError");

// node_modules/@composio/client/core/error.mjs
var ComposioError = class extends Error {
  static {
    __name(this, "ComposioError");
  }
};
var APIError = class _APIError extends ComposioError {
  static {
    __name(this, "APIError");
  }
  constructor(status, error, message, headers) {
    super(`${_APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.error = error;
  }
  static makeMessage(status, error, message) {
    const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers) {
      return new APIConnectionError({ message, cause: castToError(errorResponse) });
    }
    const error = errorResponse;
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new _APIError(status, error, message, headers);
  }
};
var APIUserAbortError = class extends APIError {
  static {
    __name(this, "APIUserAbortError");
  }
  constructor({ message } = {}) {
    super(void 0, void 0, message || "Request was aborted.", void 0);
  }
};
var APIConnectionError = class extends APIError {
  static {
    __name(this, "APIConnectionError");
  }
  constructor({ message, cause }) {
    super(void 0, void 0, message || "Connection error.", void 0);
    if (cause)
      this.cause = cause;
  }
};
var APIConnectionTimeoutError = class extends APIConnectionError {
  static {
    __name(this, "APIConnectionTimeoutError");
  }
  constructor({ message } = {}) {
    super({ message: message ?? "Request timed out." });
  }
};
var BadRequestError = class extends APIError {
  static {
    __name(this, "BadRequestError");
  }
};
var AuthenticationError = class extends APIError {
  static {
    __name(this, "AuthenticationError");
  }
};
var PermissionDeniedError = class extends APIError {
  static {
    __name(this, "PermissionDeniedError");
  }
};
var NotFoundError = class extends APIError {
  static {
    __name(this, "NotFoundError");
  }
};
var ConflictError = class extends APIError {
  static {
    __name(this, "ConflictError");
  }
};
var UnprocessableEntityError = class extends APIError {
  static {
    __name(this, "UnprocessableEntityError");
  }
};
var RateLimitError = class extends APIError {
  static {
    __name(this, "RateLimitError");
  }
};
var InternalServerError = class extends APIError {
  static {
    __name(this, "InternalServerError");
  }
};

// node_modules/@composio/client/internal/utils/values.mjs
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = /* @__PURE__ */ __name((url) => {
  return startsWithSchemeRegexp.test(url);
}, "isAbsoluteURL");
var isArray = /* @__PURE__ */ __name((val) => (isArray = Array.isArray, isArray(val)), "isArray");
var isReadonlyArray = isArray;
function isEmptyObj(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}
__name(isEmptyObj, "isEmptyObj");
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
__name(hasOwn, "hasOwn");
var validatePositiveInteger = /* @__PURE__ */ __name((name, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new ComposioError(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new ComposioError(`${name} must be a positive integer`);
  }
  return n;
}, "validatePositiveInteger");
var safeJSON = /* @__PURE__ */ __name((text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return void 0;
  }
}, "safeJSON");

// node_modules/@composio/client/internal/utils/sleep.mjs
init_esm();
var sleep = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "sleep");

// node_modules/@composio/client/internal/detect-platform.mjs
init_esm();

// node_modules/@composio/client/version.mjs
init_esm();
var VERSION = "0.1.0-alpha.60";

// node_modules/@composio/client/internal/detect-platform.mjs
function getDetectedPlatform() {
  if (typeof Deno !== "undefined" && Deno.build != null) {
    return "deno";
  }
  if (typeof EdgeRuntime !== "undefined") {
    return "edge";
  }
  if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") {
    return "node";
  }
  return "unknown";
}
__name(getDetectedPlatform, "getDetectedPlatform");
var getPlatformProperties = /* @__PURE__ */ __name(() => {
  const detectedPlatform = getDetectedPlatform();
  if (detectedPlatform === "deno") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(Deno.build.os),
      "X-Stainless-Arch": normalizeArch(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
    };
  }
  if (typeof EdgeRuntime !== "undefined") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process.version
    };
  }
  if (detectedPlatform === "node") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(globalThis.process.platform ?? "unknown"),
      "X-Stainless-Arch": normalizeArch(globalThis.process.arch ?? "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
    };
  }
  const browserInfo = getBrowserInfo();
  if (browserInfo) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version
    };
  }
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
}, "getPlatformProperties");
function getBrowserInfo() {
  if (typeof navigator === "undefined" || !navigator) {
    return null;
  }
  const browserPatterns = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;
      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }
  return null;
}
__name(getBrowserInfo, "getBrowserInfo");
var normalizeArch = /* @__PURE__ */ __name((arch) => {
  if (arch === "x32")
    return "x32";
  if (arch === "x86_64" || arch === "x64")
    return "x64";
  if (arch === "arm")
    return "arm";
  if (arch === "aarch64" || arch === "arm64")
    return "arm64";
  if (arch)
    return `other:${arch}`;
  return "unknown";
}, "normalizeArch");
var normalizePlatform = /* @__PURE__ */ __name((platform2) => {
  platform2 = platform2.toLowerCase();
  if (platform2.includes("ios"))
    return "iOS";
  if (platform2 === "android")
    return "Android";
  if (platform2 === "darwin")
    return "MacOS";
  if (platform2 === "win32")
    return "Windows";
  if (platform2 === "freebsd")
    return "FreeBSD";
  if (platform2 === "openbsd")
    return "OpenBSD";
  if (platform2 === "linux")
    return "Linux";
  if (platform2)
    return `Other:${platform2}`;
  return "Unknown";
}, "normalizePlatform");
var _platformHeaders;
var getPlatformHeaders = /* @__PURE__ */ __name(() => {
  return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
}, "getPlatformHeaders");

// node_modules/@composio/client/internal/shims.mjs
init_esm();
function getDefaultFetch() {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new Composio({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
__name(getDefaultFetch, "getDefaultFetch");
function makeReadableStream(...args) {
  const ReadableStream = globalThis.ReadableStream;
  if (typeof ReadableStream === "undefined") {
    throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  }
  return new ReadableStream(...args);
}
__name(makeReadableStream, "makeReadableStream");
function ReadableStreamFrom(iterable) {
  let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
  return makeReadableStream({
    start() {
    },
    async pull(controller) {
      const { done, value } = await iter.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    async cancel() {
      await iter.return?.();
    }
  });
}
__name(ReadableStreamFrom, "ReadableStreamFrom");
async function CancelReadableStream(stream) {
  if (stream === null || typeof stream !== "object")
    return;
  if (stream[Symbol.asyncIterator]) {
    await stream[Symbol.asyncIterator]().return?.();
    return;
  }
  const reader = stream.getReader();
  const cancelPromise = reader.cancel();
  reader.releaseLock();
  await cancelPromise;
}
__name(CancelReadableStream, "CancelReadableStream");

// node_modules/@composio/client/internal/request-options.mjs
init_esm();
var FallbackEncoder = /* @__PURE__ */ __name(({ headers, body }) => {
  return {
    bodyHeaders: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}, "FallbackEncoder");

// node_modules/@composio/client/internal/qs/index.mjs
init_esm();

// node_modules/@composio/client/internal/qs/formats.mjs
init_esm();
var default_format = "RFC3986";
var default_formatter = /* @__PURE__ */ __name((v) => String(v), "default_formatter");
var formatters = {
  RFC1738: /* @__PURE__ */ __name((v) => String(v).replace(/%20/g, "+"), "RFC1738"),
  RFC3986: default_formatter
};
var RFC1738 = "RFC1738";

// node_modules/@composio/client/internal/qs/stringify.mjs
init_esm();

// node_modules/@composio/client/internal/qs/utils.mjs
init_esm();
var has = /* @__PURE__ */ __name((obj, key) => (has = Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty), has(obj, key)), "has");
var hex_table = /* @__PURE__ */ (() => {
  const array = [];
  for (let i = 0; i < 256; ++i) {
    array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
  }
  return array;
})();
var limit = 1024;
var encode = /* @__PURE__ */ __name((str2, _defaultEncoder, charset, _kind, format) => {
  if (str2.length === 0) {
    return str2;
  }
  let string = str2;
  if (typeof str2 === "symbol") {
    string = Symbol.prototype.toString.call(str2);
  } else if (typeof str2 !== "string") {
    string = String(str2);
  }
  if (charset === "iso-8859-1") {
    return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
      return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
    });
  }
  let out = "";
  for (let j = 0; j < string.length; j += limit) {
    const segment = string.length >= limit ? string.slice(j, j + limit) : string;
    const arr = [];
    for (let i = 0; i < segment.length; ++i) {
      let c = segment.charCodeAt(i);
      if (c === 45 || // -
      c === 46 || // .
      c === 95 || // _
      c === 126 || // ~
      c >= 48 && c <= 57 || // 0-9
      c >= 65 && c <= 90 || // a-z
      c >= 97 && c <= 122 || // A-Z
      format === RFC1738 && (c === 40 || c === 41)) {
        arr[arr.length] = segment.charAt(i);
        continue;
      }
      if (c < 128) {
        arr[arr.length] = hex_table[c];
        continue;
      }
      if (c < 2048) {
        arr[arr.length] = hex_table[192 | c >> 6] + hex_table[128 | c & 63];
        continue;
      }
      if (c < 55296 || c >= 57344) {
        arr[arr.length] = hex_table[224 | c >> 12] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
        continue;
      }
      i += 1;
      c = 65536 + ((c & 1023) << 10 | segment.charCodeAt(i) & 1023);
      arr[arr.length] = hex_table[240 | c >> 18] + hex_table[128 | c >> 12 & 63] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
    }
    out += arr.join("");
  }
  return out;
}, "encode");
function is_buffer(obj) {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
__name(is_buffer, "is_buffer");
function maybe_map(val, fn) {
  if (isArray(val)) {
    const mapped = [];
    for (let i = 0; i < val.length; i += 1) {
      mapped.push(fn(val[i]));
    }
    return mapped;
  }
  return fn(val);
}
__name(maybe_map, "maybe_map");

// node_modules/@composio/client/internal/qs/stringify.mjs
var array_prefix_generators = {
  brackets(prefix) {
    return String(prefix) + "[]";
  },
  comma: "comma",
  indices(prefix, key) {
    return String(prefix) + "[" + key + "]";
  },
  repeat(prefix) {
    return String(prefix);
  }
};
var push_to_array = /* @__PURE__ */ __name(function(arr, value_or_array) {
  Array.prototype.push.apply(arr, isArray(value_or_array) ? value_or_array : [value_or_array]);
}, "push_to_array");
var toISOString;
var defaults = {
  addQueryPrefix: false,
  allowDots: false,
  allowEmptyArrays: false,
  arrayFormat: "indices",
  charset: "utf-8",
  charsetSentinel: false,
  delimiter: "&",
  encode: true,
  encodeDotInKeys: false,
  encoder: encode,
  encodeValuesOnly: false,
  format: default_format,
  formatter: default_formatter,
  /** @deprecated */
  indices: false,
  serializeDate(date) {
    return (toISOString ?? (toISOString = Function.prototype.call.bind(Date.prototype.toISOString)))(date);
  },
  skipNulls: false,
  strictNullHandling: false
};
function is_non_nullish_primitive(v) {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || typeof v === "symbol" || typeof v === "bigint";
}
__name(is_non_nullish_primitive, "is_non_nullish_primitive");
var sentinel = {};
function inner_stringify(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
  let obj = object;
  let tmp_sc = sideChannel;
  let step = 0;
  let find_flag = false;
  while ((tmp_sc = tmp_sc.get(sentinel)) !== void 0 && !find_flag) {
    const pos = tmp_sc.get(object);
    step += 1;
    if (typeof pos !== "undefined") {
      if (pos === step) {
        throw new RangeError("Cyclic object value");
      } else {
        find_flag = true;
      }
    }
    if (typeof tmp_sc.get(sentinel) === "undefined") {
      step = 0;
    }
  }
  if (typeof filter === "function") {
    obj = filter(prefix, obj);
  } else if (obj instanceof Date) {
    obj = serializeDate?.(obj);
  } else if (generateArrayPrefix === "comma" && isArray(obj)) {
    obj = maybe_map(obj, function(value) {
      if (value instanceof Date) {
        return serializeDate?.(value);
      }
      return value;
    });
  }
  if (obj === null) {
    if (strictNullHandling) {
      return encoder && !encodeValuesOnly ? (
        // @ts-expect-error
        encoder(prefix, defaults.encoder, charset, "key", format)
      ) : prefix;
    }
    obj = "";
  }
  if (is_non_nullish_primitive(obj) || is_buffer(obj)) {
    if (encoder) {
      const key_value = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, "key", format);
      return [
        formatter?.(key_value) + "=" + // @ts-expect-error
        formatter?.(encoder(obj, defaults.encoder, charset, "value", format))
      ];
    }
    return [formatter?.(prefix) + "=" + formatter?.(String(obj))];
  }
  const values = [];
  if (typeof obj === "undefined") {
    return values;
  }
  let obj_keys;
  if (generateArrayPrefix === "comma" && isArray(obj)) {
    if (encodeValuesOnly && encoder) {
      obj = maybe_map(obj, encoder);
    }
    obj_keys = [{ value: obj.length > 0 ? obj.join(",") || null : void 0 }];
  } else if (isArray(filter)) {
    obj_keys = filter;
  } else {
    const keys = Object.keys(obj);
    obj_keys = sort ? keys.sort(sort) : keys;
  }
  const encoded_prefix = encodeDotInKeys ? String(prefix).replace(/\./g, "%2E") : String(prefix);
  const adjusted_prefix = commaRoundTrip && isArray(obj) && obj.length === 1 ? encoded_prefix + "[]" : encoded_prefix;
  if (allowEmptyArrays && isArray(obj) && obj.length === 0) {
    return adjusted_prefix + "[]";
  }
  for (let j = 0; j < obj_keys.length; ++j) {
    const key = obj_keys[j];
    const value = (
      // @ts-ignore
      typeof key === "object" && typeof key.value !== "undefined" ? key.value : obj[key]
    );
    if (skipNulls && value === null) {
      continue;
    }
    const encoded_key = allowDots && encodeDotInKeys ? key.replace(/\./g, "%2E") : key;
    const key_prefix = isArray(obj) ? typeof generateArrayPrefix === "function" ? generateArrayPrefix(adjusted_prefix, encoded_key) : adjusted_prefix : adjusted_prefix + (allowDots ? "." + encoded_key : "[" + encoded_key + "]");
    sideChannel.set(object, step);
    const valueSideChannel = /* @__PURE__ */ new WeakMap();
    valueSideChannel.set(sentinel, sideChannel);
    push_to_array(values, inner_stringify(
      value,
      key_prefix,
      generateArrayPrefix,
      commaRoundTrip,
      allowEmptyArrays,
      strictNullHandling,
      skipNulls,
      encodeDotInKeys,
      // @ts-ignore
      generateArrayPrefix === "comma" && encodeValuesOnly && isArray(obj) ? null : encoder,
      filter,
      sort,
      allowDots,
      serializeDate,
      format,
      formatter,
      encodeValuesOnly,
      charset,
      valueSideChannel
    ));
  }
  return values;
}
__name(inner_stringify, "inner_stringify");
function normalize_stringify_options(opts = defaults) {
  if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") {
    throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  }
  if (typeof opts.encodeDotInKeys !== "undefined" && typeof opts.encodeDotInKeys !== "boolean") {
    throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
  }
  if (opts.encoder !== null && typeof opts.encoder !== "undefined" && typeof opts.encoder !== "function") {
    throw new TypeError("Encoder has to be a function.");
  }
  const charset = opts.charset || defaults.charset;
  if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") {
    throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  }
  let format = default_format;
  if (typeof opts.format !== "undefined") {
    if (!has(formatters, opts.format)) {
      throw new TypeError("Unknown format option provided.");
    }
    format = opts.format;
  }
  const formatter = formatters[format];
  let filter = defaults.filter;
  if (typeof opts.filter === "function" || isArray(opts.filter)) {
    filter = opts.filter;
  }
  let arrayFormat;
  if (opts.arrayFormat && opts.arrayFormat in array_prefix_generators) {
    arrayFormat = opts.arrayFormat;
  } else if ("indices" in opts) {
    arrayFormat = opts.indices ? "indices" : "repeat";
  } else {
    arrayFormat = defaults.arrayFormat;
  }
  if ("commaRoundTrip" in opts && typeof opts.commaRoundTrip !== "boolean") {
    throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
  }
  const allowDots = typeof opts.allowDots === "undefined" ? !!opts.encodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;
  return {
    addQueryPrefix: typeof opts.addQueryPrefix === "boolean" ? opts.addQueryPrefix : defaults.addQueryPrefix,
    // @ts-ignore
    allowDots,
    allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
    arrayFormat,
    charset,
    charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults.charsetSentinel,
    commaRoundTrip: !!opts.commaRoundTrip,
    delimiter: typeof opts.delimiter === "undefined" ? defaults.delimiter : opts.delimiter,
    encode: typeof opts.encode === "boolean" ? opts.encode : defaults.encode,
    encodeDotInKeys: typeof opts.encodeDotInKeys === "boolean" ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
    encoder: typeof opts.encoder === "function" ? opts.encoder : defaults.encoder,
    encodeValuesOnly: typeof opts.encodeValuesOnly === "boolean" ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
    filter,
    format,
    formatter,
    serializeDate: typeof opts.serializeDate === "function" ? opts.serializeDate : defaults.serializeDate,
    skipNulls: typeof opts.skipNulls === "boolean" ? opts.skipNulls : defaults.skipNulls,
    // @ts-ignore
    sort: typeof opts.sort === "function" ? opts.sort : null,
    strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults.strictNullHandling
  };
}
__name(normalize_stringify_options, "normalize_stringify_options");
function stringify(object, opts = {}) {
  let obj = object;
  const options = normalize_stringify_options(opts);
  let obj_keys;
  let filter;
  if (typeof options.filter === "function") {
    filter = options.filter;
    obj = filter("", obj);
  } else if (isArray(options.filter)) {
    filter = options.filter;
    obj_keys = filter;
  }
  const keys = [];
  if (typeof obj !== "object" || obj === null) {
    return "";
  }
  const generateArrayPrefix = array_prefix_generators[options.arrayFormat];
  const commaRoundTrip = generateArrayPrefix === "comma" && options.commaRoundTrip;
  if (!obj_keys) {
    obj_keys = Object.keys(obj);
  }
  if (options.sort) {
    obj_keys.sort(options.sort);
  }
  const sideChannel = /* @__PURE__ */ new WeakMap();
  for (let i = 0; i < obj_keys.length; ++i) {
    const key = obj_keys[i];
    if (options.skipNulls && obj[key] === null) {
      continue;
    }
    push_to_array(keys, inner_stringify(
      obj[key],
      key,
      // @ts-expect-error
      generateArrayPrefix,
      commaRoundTrip,
      options.allowEmptyArrays,
      options.strictNullHandling,
      options.skipNulls,
      options.encodeDotInKeys,
      options.encode ? options.encoder : null,
      options.filter,
      options.sort,
      options.allowDots,
      options.serializeDate,
      options.format,
      options.formatter,
      options.encodeValuesOnly,
      options.charset,
      sideChannel
    ));
  }
  const joined = keys.join(options.delimiter);
  let prefix = options.addQueryPrefix === true ? "?" : "";
  if (options.charsetSentinel) {
    if (options.charset === "iso-8859-1") {
      prefix += "utf8=%26%2310003%3B&";
    } else {
      prefix += "utf8=%E2%9C%93&";
    }
  }
  return joined.length > 0 ? prefix + joined : "";
}
__name(stringify, "stringify");

// node_modules/@composio/client/core/uploads.mjs
init_esm();

// node_modules/@composio/client/internal/to-file.mjs
init_esm();

// node_modules/@composio/client/internal/uploads.mjs
init_esm();
var checkFileSupport = /* @__PURE__ */ __name(() => {
  if (typeof File === "undefined") {
    const { process: process2 } = globalThis;
    const isOldNode = typeof process2?.versions?.node === "string" && parseInt(process2.versions.node.split(".")) < 20;
    throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
}, "checkFileSupport");
function makeFile(fileBits, fileName, options) {
  checkFileSupport();
  return new File(fileBits, fileName ?? "unknown_file", options);
}
__name(makeFile, "makeFile");
function getName(value) {
  return (typeof value === "object" && value !== null && ("name" in value && value.name && String(value.name) || "url" in value && value.url && String(value.url) || "filename" in value && value.filename && String(value.filename) || "path" in value && value.path && String(value.path)) || "").split(/[\\/]/).pop() || void 0;
}
__name(getName, "getName");
var isAsyncIterable = /* @__PURE__ */ __name((value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function", "isAsyncIterable");

// node_modules/@composio/client/internal/to-file.mjs
var isBlobLike = /* @__PURE__ */ __name((value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function", "isBlobLike");
var isFileLike = /* @__PURE__ */ __name((value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value), "isFileLike");
var isResponseLike = /* @__PURE__ */ __name((value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function", "isResponseLike");
async function toFile(value, name, options) {
  checkFileSupport();
  value = await value;
  if (isFileLike(value)) {
    if (value instanceof File) {
      return value;
    }
    return makeFile([await value.arrayBuffer()], value.name);
  }
  if (isResponseLike(value)) {
    const blob = await value.blob();
    name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
    return makeFile(await getBytes(blob), name, options);
  }
  const parts = await getBytes(value);
  name || (name = getName(value));
  if (!options?.type) {
    const type = parts.find((part) => typeof part === "object" && "type" in part && part.type);
    if (typeof type === "string") {
      options = { ...options, type };
    }
  }
  return makeFile(parts, name, options);
}
__name(toFile, "toFile");
async function getBytes(value) {
  let parts = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
  value instanceof ArrayBuffer) {
    parts.push(value);
  } else if (isBlobLike(value)) {
    parts.push(value instanceof Blob ? value : await value.arrayBuffer());
  } else if (isAsyncIterable(value)) {
    for await (const chunk of value) {
      parts.push(...await getBytes(chunk));
    }
  } else {
    const constructor = value?.constructor?.name;
    throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError(value)}`);
  }
  return parts;
}
__name(getBytes, "getBytes");
function propsForError(value) {
  if (typeof value !== "object" || value === null)
    return "";
  const props = Object.getOwnPropertyNames(value);
  return `; props: [${props.map((p) => `"${p}"`).join(", ")}]`;
}
__name(propsForError, "propsForError");

// node_modules/@composio/client/resources/index.mjs
init_esm();

// node_modules/@composio/client/resources/auth-configs.mjs
init_esm();

// node_modules/@composio/client/core/resource.mjs
init_esm();
var APIResource = class {
  static {
    __name(this, "APIResource");
  }
  constructor(client) {
    this._client = client;
  }
};

// node_modules/@composio/client/internal/utils/path.mjs
init_esm();
function encodeURIPath(str2) {
  return str2.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
__name(encodeURIPath, "encodeURIPath");
var EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
var createPathTagFunction = /* @__PURE__ */ __name((pathEncoder = encodeURIPath) => /* @__PURE__ */ __name(function path4(statics, ...params) {
  if (statics.length === 1)
    return statics[0];
  let postPath = false;
  const invalidSegments = [];
  const path5 = statics.reduce((previousValue, currentValue, index) => {
    if (/[?#]/.test(currentValue)) {
      postPath = true;
    }
    const value = params[index];
    let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
    if (index !== params.length && (value == null || typeof value === "object" && // handle values from other realms
    value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)?.toString)) {
      encoded = value + "";
      invalidSegments.push({
        start: previousValue.length + currentValue.length,
        length: encoded.length,
        error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
      });
    }
    return previousValue + currentValue + (index === params.length ? "" : encoded);
  }, "");
  const pathOnly = path5.split(/[?#]/, 1)[0];
  const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
  let match;
  while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
    invalidSegments.push({
      start: match.index,
      length: match[0].length,
      error: `Value "${match[0]}" can't be safely passed as a path parameter`
    });
  }
  invalidSegments.sort((a, b) => a.start - b.start);
  if (invalidSegments.length > 0) {
    let lastEnd = 0;
    const underline = invalidSegments.reduce((acc, segment) => {
      const spaces = " ".repeat(segment.start - lastEnd);
      const arrows = "^".repeat(segment.length);
      lastEnd = segment.start + segment.length;
      return acc + spaces + arrows;
    }, "");
    throw new ComposioError(`Path parameters result in path with invalid segments:
${invalidSegments.map((e) => e.error).join("\n")}
${path5}
${underline}`);
  }
  return path5;
}, "path"), "createPathTagFunction");
var path = /* @__PURE__ */ createPathTagFunction(encodeURIPath);

// node_modules/@composio/client/resources/auth-configs.mjs
var AuthConfigs = class extends APIResource {
  static {
    __name(this, "AuthConfigs");
  }
  /**
   * Creates a new auth config for a toolkit, allowing you to use your own OAuth
   * credentials or API keys instead of Composio-managed authentication. This is
   * required when you want to use custom OAuth apps (bring your own client
   * ID/secret) or configure specific authentication parameters for a toolkit.
   *
   * @example
   * ```ts
   * const authConfig = await client.authConfigs.create({
   *   toolkit: { slug: 'slug' },
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/api/v3/auth_configs", { body, ...options });
  }
  /**
   * Retrieves detailed information about a specific authentication configuration
   * using its unique identifier.
   *
   * @example
   * ```ts
   * const authConfig = await client.authConfigs.retrieve(
   *   'nanoid',
   * );
   * ```
   */
  retrieve(nanoid, options) {
    return this._client.get(path`/api/v3/auth_configs/${nanoid}`, options);
  }
  /**
   * Modifies an existing authentication configuration with new credentials or other
   * settings. Only specified fields will be updated.
   *
   * @example
   * ```ts
   * const authConfig = await client.authConfigs.update(
   *   'nanoid',
   *   { type: 'custom' },
   * );
   * ```
   */
  update(nanoid, body, options) {
    return this._client.patch(path`/api/v3/auth_configs/${nanoid}`, { body, ...options });
  }
  /**
   * Retrieves all auth configs for your project. Auth configs define how users
   * authenticate with external services (OAuth, API keys, etc.). Use filters to find
   * configs for specific toolkits or to distinguish between Composio-managed and
   * custom configurations.
   *
   * @example
   * ```ts
   * const authConfigs = await client.authConfigs.list();
   * ```
   */
  list(query = {}, options) {
    return this._client.get("/api/v3/auth_configs", { query, ...options });
  }
  /**
   * Soft-deletes an authentication configuration by marking it as deleted in the
   * database. This operation cannot be undone.
   *
   * @example
   * ```ts
   * const authConfig = await client.authConfigs.delete(
   *   'nanoid',
   * );
   * ```
   */
  delete(nanoid, options) {
    return this._client.delete(path`/api/v3/auth_configs/${nanoid}`, options);
  }
  /**
   * Updates the status of an authentication configuration to either enabled or
   * disabled. Disabled configurations cannot be used for new connections.
   *
   * @example
   * ```ts
   * const response = await client.authConfigs.updateStatus(
   *   'ENABLED',
   *   { nanoid: 'nanoid' },
   * );
   * ```
   */
  updateStatus(status, params, options) {
    const { nanoid } = params;
    return this._client.patch(path`/api/v3/auth_configs/${nanoid}/${status}`, options);
  }
};

// node_modules/@composio/client/resources/cli/cli.mjs
init_esm();

// node_modules/@composio/client/resources/cli/realtime.mjs
init_esm();
var Realtime = class extends APIResource {
  static {
    __name(this, "Realtime");
  }
  /**
   * Authenticate CLI client access to a private-cli-{nanoId} Pusher channel
   */
  auth(body, options) {
    return this._client.post("/api/v3/cli/realtime/auth", { body, ...options });
  }
  /**
   * Get the Pusher key and project nanoId for the CLI realtime trigger channel. The
   * CLI subscribes to private-cli-{project_id}.
   */
  credentials(options) {
    return this._client.get("/api/v3/cli/realtime/credentials", options);
  }
};

// node_modules/@composio/client/resources/cli/cli.mjs
var Cli = class extends APIResource {
  static {
    __name(this, "Cli");
  }
  constructor() {
    super(...arguments);
    this.realtime = new Realtime(this._client);
  }
  /**
   * Generates a new CLI session with a random 6-character code. This endpoint is the
   * first step in the CLI authentication flow, creating a session that can later be
   * linked to a user account. The generated code is displayed to the user in the CLI
   * and should be entered in the web interface to complete authentication.
   * Optionally accepts a scope ('project' or 'user') and a source string.
   */
  createSession(body = {}, options) {
    return this._client.post("/api/v3/cli/create-session", { body, ...options });
  }
  /**
   * Retrieves the current state of a CLI session using either the session ID (UUID)
   * or the 6-character code. This endpoint is used by both the CLI client to check
   * if the session has been linked, and by the web interface to display session
   * details before linking.
   */
  getSession(query, options) {
    return this._client.get("/api/v3/cli/get-session", { query, ...options });
  }
};
Cli.Realtime = Realtime;

// node_modules/@composio/client/resources/connected-accounts.mjs
init_esm();
var ConnectedAccounts = class extends APIResource {
  static {
    __name(this, "ConnectedAccounts");
  }
  /**
   * Initiates a new connection to an external service for a user. For OAuth-based
   * toolkits, this returns a redirect URL to complete authentication. For API
   * key-based toolkits, provide the credentials directly in the request body. Use
   * the `user_id` field to associate the connection with a specific user in your
   * system.
   *
   * @example
   * ```ts
   * const connectedAccount =
   *   await client.connectedAccounts.create({
   *     auth_config: { id: 'id' },
   *     connection: {},
   *   });
   * ```
   */
  create(body, options) {
    return this._client.post("/api/v3/connected_accounts", { body, ...options });
  }
  /**
   * Retrieves comprehensive details of a connected account, including authentication
   * configuration, connection status, and all parameters needed for API requests.
   *
   * @example
   * ```ts
   * const connectedAccount =
   *   await client.connectedAccounts.retrieve(
   *     'con_1a2b3c4d5e6f',
   *   );
   * ```
   */
  retrieve(nanoid, options) {
    return this._client.get(path`/api/v3/connected_accounts/${nanoid}`, options);
  }
  /**
   * Retrieves all connected accounts for your project. Connected accounts represent
   * authenticated user connections to external services (e.g., a user's Gmail
   * account, Slack workspace). Filter by toolkit, status, user ID, or auth config to
   * find specific connections.
   *
   * @example
   * ```ts
   * const connectedAccounts =
   *   await client.connectedAccounts.list();
   * ```
   */
  list(query = {}, options) {
    return this._client.get("/api/v3/connected_accounts", { query, ...options });
  }
  /**
   * Soft-deletes a connected account by marking it as deleted in the database. This
   * prevents the account from being used for API calls but preserves the record for
   * audit purposes.
   *
   * @example
   * ```ts
   * const connectedAccount =
   *   await client.connectedAccounts.delete('con_1a2b3c4d5e6f');
   * ```
   */
  delete(nanoid, options) {
    return this._client.delete(path`/api/v3/connected_accounts/${nanoid}`, options);
  }
  /**
   * Initiates a new authentication flow for a connected account when credentials
   * have expired or become invalid. This may generate a new authentication URL for
   * OAuth flows or refresh tokens for other auth schemes.
   *
   * @example
   * ```ts
   * const response = await client.connectedAccounts.refresh(
   *   'con_1a2b3c4d5e6f',
   * );
   * ```
   */
  refresh(nanoid, params = {}, options) {
    const { query_redirect_url, ...body } = params ?? {};
    return this._client.post(path`/api/v3/connected_accounts/${nanoid}/refresh`, {
      query: { redirect_url: query_redirect_url },
      body,
      ...options
    });
  }
  /**
   * Updates the status of a connected account to either enabled (active) or disabled
   * (inactive). Disabled accounts cannot be used for API calls but remain in the
   * database.
   *
   * @example
   * ```ts
   * const response =
   *   await client.connectedAccounts.updateStatus(
   *     'con_1a2b3c4d5e6f',
   *     { enabled: true },
   *   );
   * ```
   */
  updateStatus(nanoID, body, options) {
    return this._client.patch(path`/api/v3/connected_accounts/${nanoID}/status`, { body, ...options });
  }
};

// node_modules/@composio/client/resources/files.mjs
init_esm();
var Files = class extends APIResource {
  static {
    __name(this, "Files");
  }
  /**
   * Retrieves a list of files associated with the authenticated project. Results can
   * be filtered by toolkit and tool slugs.
   *
   * @example
   * ```ts
   * const files = await client.files.list();
   * ```
   */
  list(query = {}, options) {
    return this._client.get("/api/v3/files/list", { query, ...options });
  }
  /**
   * Generates a presigned URL for uploading a file to S3. This endpoint handles
   * deduplication by checking if a file with the same MD5 hash already exists.
   *
   * @example
   * ```ts
   * const response = await client.files.createPresignedURL({
   *   filename: 'quarterly_report.pdf',
   *   md5: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
   *   mimetype: 'application/pdf',
   *   tool_slug: 'GMAIL_SEND_EMAIL',
   *   toolkit_slug: 'gmail',
   * });
   * ```
   */
  createPresignedURL(body, options) {
    return this._client.post("/api/v3/files/upload/request", { body, ...options });
  }
};

// node_modules/@composio/client/resources/link.mjs
init_esm();
var Link = class extends APIResource {
  static {
    __name(this, "Link");
  }
  /**
   * Creates a new authentication link session that users can use to connect their
   * accounts
   */
  create(body, options) {
    return this._client.post("/api/v3/connected_accounts/link", { body, ...options });
  }
};

// node_modules/@composio/client/resources/logs/logs.mjs
init_esm();

// node_modules/@composio/client/resources/logs/tools.mjs
init_esm();
var Tools = class extends APIResource {
  static {
    __name(this, "Tools");
  }
  /**
   * Get detailed execution log by ID
   *
   * @example
   * ```ts
   * const tool = await client.logs.tools.retrieve('id');
   * ```
   */
  retrieve(id, options) {
    return this._client.get(path`/api/v3/internal/action_execution/log/${id}`, options);
  }
  /**
   * Search and retrieve action execution logs
   *
   * @example
   * ```ts
   * const tools = await client.logs.tools.list({ cursor: 0 });
   * ```
   */
  list(body, options) {
    return this._client.post("/api/v3/internal/action_execution/logs", { body, ...options });
  }
};

// node_modules/@composio/client/resources/logs/triggers.mjs
init_esm();
var Triggers = class extends APIResource {
  static {
    __name(this, "Triggers");
  }
  /**
   * Get detailed trigger log by ID
   *
   * @example
   * ```ts
   * const trigger = await client.logs.triggers.retrieve('id');
   * ```
   */
  retrieve(id, options) {
    return this._client.get(path`/api/v3/internal/trigger/log/${id}`, options);
  }
  /**
   * Search and retrieve trigger event logs with advanced filtering capabilities
   * including search parameters
   *
   * @example
   * ```ts
   * const triggers = await client.logs.triggers.list();
   * ```
   */
  list(body = {}, options) {
    return this._client.post("/api/v3/internal/trigger/logs", { body, ...options });
  }
};

// node_modules/@composio/client/resources/logs/logs.mjs
var Logs = class extends APIResource {
  static {
    __name(this, "Logs");
  }
  constructor() {
    super(...arguments);
    this.triggers = new Triggers(this._client);
    this.tools = new Tools(this._client);
  }
};
Logs.Triggers = Triggers;
Logs.Tools = Tools;

// node_modules/@composio/client/resources/mcp/mcp.mjs
init_esm();

// node_modules/@composio/client/resources/mcp/custom.mjs
init_esm();
var Custom = class extends APIResource {
  static {
    __name(this, "Custom");
  }
  /**
   * Creates a new Model Control Protocol (MCP) server instance that can integrate
   * with multiple applications or toolkits simultaneously. This endpoint allows you
   * to create a server that can access tools from different applications, making it
   * suitable for complex workflows that span multiple services.
   *
   * @example
   * ```ts
   * const custom = await client.mcp.custom.create({
   *   name: 'Development Integration Server',
   *   toolkits: ['github', 'jira'],
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/api/v3/mcp/servers/custom", { body, ...options });
  }
};

// node_modules/@composio/client/resources/mcp/generate.mjs
init_esm();
var Generate = class extends APIResource {
  static {
    __name(this, "Generate");
  }
  /**
   * Generates a Model Control Protocol (MCP) URL for an existing server with custom
   * query parameters. The URL includes user-specific parameters and configuration
   * flags that control the behavior of the MCP connection.
   *
   * @example
   * ```ts
   * const response = await client.mcp.generate.url({
   *   mcp_server_id: '550e8400-e29b-41d4-a716-446655440000',
   *   connected_account_ids: ['account_1', 'account_2'],
   *   user_ids: ['user_123456'],
   * });
   * ```
   */
  url(body, options) {
    return this._client.post("/api/v3/mcp/servers/generate", { body, ...options });
  }
};

// node_modules/@composio/client/resources/mcp/mcp.mjs
var Mcp = class extends APIResource {
  static {
    __name(this, "Mcp");
  }
  constructor() {
    super(...arguments);
    this.custom = new Custom(this._client);
    this.generate = new Generate(this._client);
  }
  /**
   * Creates a new Model Control Protocol (MCP) server instance for the authenticated
   * project. An MCP server provides a connection point for AI assistants to access
   * your applications and services. The server is configured with specific
   * authentication and tool permissions that determine what actions the connected
   * assistants can perform.
   *
   * @example
   * ```ts
   * const mcp = await client.mcp.create({
   *   auth_config_ids: ['auth_cfg_abc123def456'],
   *   name: 'GitHub Integration Server',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/api/v3/mcp/servers", { body, ...options });
  }
  /**
   * Retrieves detailed configuration information for a specific Model Control
   * Protocol (MCP) server. The returned data includes connection details, associated
   * applications, enabled tools, and authentication configuration.
   *
   * @example
   * ```ts
   * const mcp = await client.mcp.retrieve(
   *   '550e8400-e29b-41d4-a716-446655440000',
   * );
   * ```
   */
  retrieve(id, options) {
    return this._client.get(path`/api/v3/mcp/${id}`, options);
  }
  /**
   * Updates the configuration of an existing Model Control Protocol (MCP) server.
   * You can modify the server name, associated applications, and enabled tools. Only
   * the fields included in the request will be updated.
   *
   * @example
   * ```ts
   * const mcp = await client.mcp.update(
   *   '550e8400-e29b-41d4-a716-446655440000',
   *   { name: 'Updated GitHub Integration Server' },
   * );
   * ```
   */
  update(id, body = {}, options) {
    return this._client.patch(path`/api/v3/mcp/${id}`, { body, ...options });
  }
  /**
   * Retrieves a paginated list of MCP servers associated with the authenticated
   * project. Results can be filtered by name, toolkit, or authentication
   * configuration ID. MCP servers are used to provide Model Control Protocol
   * integration points for connecting AI assistants to your applications and
   * services.
   *
   * @example
   * ```ts
   * const mcps = await client.mcp.list();
   * ```
   */
  list(query = {}, options) {
    return this._client.get("/api/v3/mcp/servers", { query, ...options });
  }
  /**
   * Performs a soft delete on a Model Control Protocol (MCP) server, making it
   * unavailable for future use. This operation is reversible in the database but
   * cannot be undone through the API. Any applications or services connected to this
   * server will lose access after deletion.
   *
   * @example
   * ```ts
   * const mcp = await client.mcp.delete(
   *   '550e8400-e29b-41d4-a716-446655440000',
   * );
   * ```
   */
  delete(id, options) {
    return this._client.delete(path`/api/v3/mcp/${id}`, options);
  }
  /**
   * Retrieves a paginated list of Model Control Protocol (MCP) servers that are
   * configured for a specific application or toolkit. This endpoint allows you to
   * find all MCP server instances that have access to a particular application, such
   * as GitHub, Slack, or Jira.
   *
   * @example
   * ```ts
   * const response = await client.mcp.retrieveApp('github');
   * ```
   */
  retrieveApp(appKey, query = {}, options) {
    return this._client.get(path`/api/v3/mcp/app/${appKey}`, { query, ...options });
  }
};
Mcp.Custom = Custom;
Mcp.Generate = Generate;

// node_modules/@composio/client/resources/migration.mjs
init_esm();
var Migration = class extends APIResource {
  static {
    __name(this, "Migration");
  }
  /**
   * Convert a legacy UUID to its corresponding NanoId for migration purposes. This
   * endpoint facilitates the transition from UUID-based identifiers to the more
   * compact NanoId format used in the v3 API.
   */
  retrieveNanoid(query, options) {
    return this._client.get("/api/v3/migration/get-nanoid", { query, ...options });
  }
};

// node_modules/@composio/client/resources/project/project.mjs
init_esm();

// node_modules/@composio/client/resources/project/config.mjs
init_esm();
var Config = class extends APIResource {
  static {
    __name(this, "Config");
  }
  /**
   * Retrieves the current project configuration including 2FA settings.
   *
   * @example
   * ```ts
   * const config = await client.project.config.retrieve();
   * ```
   */
  retrieve(options) {
    return this._client.get("/api/v3/org/project/config", options);
  }
  /**
   * Updates the project configuration settings.
   *
   * @example
   * ```ts
   * const config = await client.project.config.update({
   *   is_2FA_enabled: true,
   * });
   * ```
   */
  update(body = {}, options) {
    return this._client.patch("/api/v3/org/project/config", { body, ...options });
  }
};

// node_modules/@composio/client/resources/project/project.mjs
var Project = class extends APIResource {
  static {
    __name(this, "Project");
  }
  constructor() {
    super(...arguments);
    this.config = new Config(this._client);
  }
};
Project.Config = Config;

// node_modules/@composio/client/resources/tool-router/tool-router.mjs
init_esm();

// node_modules/@composio/client/resources/tool-router/session.mjs
init_esm();
var Session = class extends APIResource {
  static {
    __name(this, "Session");
  }
  /**
   * Creates a new session for the tool router feature. This endpoint initializes a
   * new session with specified toolkits and their authentication configurations. The
   * session provides an isolated environment for testing and managing tool routing
   * logic with scoped MCP server access.
   *
   * @example
   * ```ts
   * const session = await client.toolRouter.session.create({
   *   user_id: 'user_123456789',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/api/v3/tool_router/session", { body, ...options });
  }
  /**
   * Retrieves an existing tool router session by its ID. Returns the session
   * configuration, MCP server URL, and available tools.
   *
   * @example
   * ```ts
   * const session = await client.toolRouter.session.retrieve(
   *   'trs_123456789',
   * );
   * ```
   */
  retrieve(sessionID, options) {
    return this._client.get(path`/api/v3/tool_router/session/${sessionID}`, options);
  }
  /**
   * Executes a specific tool within a tool router session. The toolkit is
   * automatically inferred from the tool slug. The tool must belong to an allowed
   * toolkit and must not be disabled in the session configuration. This endpoint
   * validates permissions, resolves connected accounts, and executes the tool with
   * the session context.
   *
   * @example
   * ```ts
   * const response = await client.toolRouter.session.execute(
   *   'trs_LX9uJKBinWWr',
   *   { tool_slug: 'GITHUB_CREATE_ISSUE' },
   * );
   * ```
   */
  execute(sessionID, body, options) {
    return this._client.post(path`/api/v3/tool_router/session/${sessionID}/execute`, { body, ...options });
  }
  /**
   * Executes a Composio meta tool (COMPOSIO\_\*) within a tool router session.
   *
   * @example
   * ```ts
   * const response =
   *   await client.toolRouter.session.executeMeta(
   *     'trs_LX9uJKBinWWr',
   *     { slug: 'COMPOSIO_MANAGE_CONNECTIONS' },
   *   );
   * ```
   */
  executeMeta(sessionID, body, options) {
    return this._client.post(path`/api/v3/tool_router/session/${sessionID}/execute_meta`, {
      body,
      ...options
    });
  }
  /**
   * Initiates an authentication link session for a specific toolkit within a tool
   * router session. Returns a link token and redirect URL that users can use to
   * complete the OAuth flow.
   *
   * @example
   * ```ts
   * const response = await client.toolRouter.session.link(
   *   'trs_LX9uJKBinWWr',
   *   { toolkit: 'github' },
   * );
   * ```
   */
  link(sessionID, body, options) {
    return this._client.post(path`/api/v3/tool_router/session/${sessionID}/link`, { body, ...options });
  }
  /**
   * Search for tools matching a given use case query within a tool router session.
   * Returns matching tool slugs, full tool schemas, toolkit connection statuses, and
   * workflow guidance in a predictable format.
   *
   * @example
   * ```ts
   * const response = await client.toolRouter.session.search(
   *   'trs_LX9uJKBinWWr',
   *   {
   *     queries: [
   *       { use_case: 'Send a slack message to a channel' },
   *     ],
   *   },
   * );
   * ```
   */
  search(sessionID, body, options) {
    return this._client.post(path`/api/v3/tool_router/session/${sessionID}/search`, { body, ...options });
  }
  /**
   * Retrieves a cursor-paginated list of toolkits available in the tool router
   * session. Includes toolkit metadata, composio-managed auth schemes, and connected
   * accounts if available. Optionally filter by specific toolkit slugs.
   *
   * @example
   * ```ts
   * const response = await client.toolRouter.session.toolkits(
   *   'trs_123456789',
   * );
   * ```
   */
  toolkits(sessionID, query = {}, options) {
    return this._client.get(path`/api/v3/tool_router/session/${sessionID}/toolkits`, { query, ...options });
  }
  /**
   * Returns the meta tools available in a tool router session with their complete
   * schemas. This includes request and response schemas specific to the session
   * context.
   *
   * @example
   * ```ts
   * const response = await client.toolRouter.session.tools(
   *   'session_id',
   * );
   * ```
   */
  tools(sessionID, query, options) {
    return this._client.get(path`/api/v3/tool_router/session/${sessionID}/tools`, options);
  }
};

// node_modules/@composio/client/resources/tool-router/tool-router.mjs
var ToolRouter = class extends APIResource {
  static {
    __name(this, "ToolRouter");
  }
  constructor() {
    super(...arguments);
    this.session = new Session(this._client);
  }
  /**
   * Creates a new session for the tool router lab feature (Legacy). This endpoint
   * initializes a new session with specified toolkits and their authentication
   * configurations. The session provides an isolated environment for testing and
   * managing tool routing logic with scoped MCP server access.
   *
   * @example
   * ```ts
   * const response = await client.toolRouter.createSession({
   *   user_id: 'user_123456789',
   *   config: {
   *     toolkits: [
   *       {
   *         toolkit: 'gmail',
   *         auth_config_id: 'auth_config_123',
   *       },
   *       {
   *         toolkit: 'slack',
   *         auth_config_id: 'auth_config_456',
   *       },
   *       { toolkit: 'github' },
   *     ],
   *   },
   * });
   * ```
   */
  createSession(body, options) {
    return this._client.post("/api/v3/labs/tool_router/session", { body, ...options });
  }
};
ToolRouter.Session = Session;

// node_modules/@composio/client/resources/toolkits.mjs
init_esm();
var Toolkits = class extends APIResource {
  static {
    __name(this, "Toolkits");
  }
  /**
   * Retrieves comprehensive information about a specific toolkit using its unique
   * slug identifier. This endpoint provides detailed metadata, authentication
   * configuration options, and feature counts for the requested toolkit.
   */
  retrieve(slug, query = {}, options) {
    return this._client.get(path`/api/v3/toolkits/${slug}`, { query, ...options });
  }
  /**
   * Retrieves a comprehensive list of toolkits of their latest versions that are
   * available to the authenticated project. Toolkits represent integration points
   * with external services and applications, each containing a collection of tools
   * and triggers. This endpoint supports filtering by category and management type,
   * as well as different sorting options.
   */
  list(query = {}, options) {
    return this._client.get("/api/v3/toolkits", { query, ...options });
  }
  /**
   * Retrieves a comprehensive list of all available toolkit categories from their
   * latest versions. These categories can be used to filter toolkits by type or
   * purpose when using the toolkit listing endpoint. Categories help organize
   * toolkits into logical groups based on their functionality or industry focus.
   */
  retrieveCategories(options) {
    return this._client.get("/api/v3/toolkits/categories", options);
  }
};

// node_modules/@composio/client/resources/tools.mjs
init_esm();

// node_modules/@composio/client/internal/headers.mjs
init_esm();
var brand_privateNullableHeaders = /* @__PURE__ */ Symbol("brand.privateNullableHeaders");
function* iterateHeaders(headers) {
  if (!headers)
    return;
  if (brand_privateNullableHeaders in headers) {
    const { values, nulls } = headers;
    yield* values.entries();
    for (const name of nulls) {
      yield [name, null];
    }
    return;
  }
  let shouldClear = false;
  let iter;
  if (headers instanceof Headers) {
    iter = headers.entries();
  } else if (isReadonlyArray(headers)) {
    iter = headers;
  } else {
    shouldClear = true;
    iter = Object.entries(headers ?? {});
  }
  for (let row of iter) {
    const name = row[0];
    if (typeof name !== "string")
      throw new TypeError("expected header name to be a string");
    const values = isReadonlyArray(row[1]) ? row[1] : [row[1]];
    let didClear = false;
    for (const value of values) {
      if (value === void 0)
        continue;
      if (shouldClear && !didClear) {
        didClear = true;
        yield [name, null];
      }
      yield [name, value];
    }
  }
}
__name(iterateHeaders, "iterateHeaders");
var buildHeaders = /* @__PURE__ */ __name((newHeaders) => {
  const targetHeaders = new Headers();
  const nullHeaders = /* @__PURE__ */ new Set();
  for (const headers of newHeaders) {
    const seenHeaders = /* @__PURE__ */ new Set();
    for (const [name, value] of iterateHeaders(headers)) {
      const lowerName = name.toLowerCase();
      if (!seenHeaders.has(lowerName)) {
        targetHeaders.delete(name);
        seenHeaders.add(lowerName);
      }
      if (value === null) {
        targetHeaders.delete(name);
        nullHeaders.add(lowerName);
      } else {
        targetHeaders.append(name, value);
        nullHeaders.delete(lowerName);
      }
    }
  }
  return { [brand_privateNullableHeaders]: true, values: targetHeaders, nulls: nullHeaders };
}, "buildHeaders");

// node_modules/@composio/client/resources/tools.mjs
var Tools2 = class extends APIResource {
  static {
    __name(this, "Tools");
  }
  /**
   * Retrieve detailed information about a specific tool using its slug identifier.
   * This endpoint returns full metadata about a tool including input/output
   * parameters, versions, and toolkit information.
   *
   * @example
   * ```ts
   * const tool = await client.tools.retrieve('tool_slug');
   * ```
   */
  retrieve(toolSlug, query = {}, options) {
    return this._client.get(path`/api/v3/tools/${toolSlug}`, { query, ...options });
  }
  /**
   * Retrieve a paginated list of available tools with comprehensive filtering,
   * sorting and search capabilities. Use query parameters to narrow down results by
   * toolkit, tags, or search terms.
   *
   * @example
   * ```ts
   * const tools = await client.tools.list();
   * ```
   */
  list(query = {}, options) {
    return this._client.get("/api/v3/tools", { query, ...options });
  }
  /**
   * Execute a specific tool operation with provided arguments and authentication.
   * This is the primary endpoint for integrating with third-party services and
   * executing tools. You can provide structured arguments or use natural language
   * processing by providing a text description of what you want to accomplish.
   *
   * @example
   * ```ts
   * const response = await client.tools.execute('tool_slug');
   * ```
   */
  execute(toolSlug, params = {}, options) {
    const { "x-llm-gateway-headers": xLlmGatewayHeaders, ...body } = params ?? {};
    return this._client.post(path`/api/v3/tools/execute/${toolSlug}`, {
      body,
      ...options,
      headers: buildHeaders([
        { ...xLlmGatewayHeaders != null ? { "x-llm-gateway-headers": xLlmGatewayHeaders } : void 0 },
        options?.headers
      ])
    });
  }
  /**
   * Uses AI to translate a natural language description into structured arguments
   * for a specific tool. This endpoint is useful when you want to let users describe
   * what they want to do in plain language instead of providing structured
   * parameters.
   *
   * @example
   * ```ts
   * const response = await client.tools.getInput('tool_slug', {
   *   text: 'I need to trigger the main workflow in the octocat/Hello-World repository to deploy to production',
   * });
   * ```
   */
  getInput(toolSlug, body, options) {
    return this._client.post(path`/api/v3/tools/execute/${toolSlug}/input`, { body, ...options });
  }
  /**
   * Proxy an HTTP request to a third-party API using connected account credentials.
   * This endpoint allows making authenticated API calls to external services while
   * abstracting away authentication details.
   *
   * @example
   * ```ts
   * const response = await client.tools.proxy({
   *   endpoint: '/api/v1/resources',
   *   method: 'GET',
   * });
   * ```
   */
  proxy(body, options) {
    return this._client.post("/api/v3/tools/execute/proxy", { body, ...options });
  }
  /**
   * Retrieve a list of all available tool enumeration values (tool slugs) from
   * latest version of each toolkit. This endpoint returns a comma-separated string
   * of tool slugs that can be used in other API calls.
   *
   * @example
   * ```ts
   * const response = await client.tools.retrieveEnum();
   * ```
   */
  retrieveEnum(options) {
    return this._client.get("/api/v3/tools/enum", options);
  }
};

// node_modules/@composio/client/resources/trigger-instances/trigger-instances.mjs
init_esm();

// node_modules/@composio/client/resources/trigger-instances/manage.mjs
init_esm();
var Manage = class extends APIResource {
  static {
    __name(this, "Manage");
  }
  /**
   * Updates the status of a trigger instance to enable or disable it. Disabling a
   * trigger pauses event listening without deleting the trigger configuration.
   * Re-enabling restores the trigger to its active state. Use this for temporary
   * maintenance or to control trigger execution.
   *
   * @example
   * ```ts
   * const manage = await client.triggerInstances.manage.update(
   *   'triggerId',
   *   { status: 'enable' },
   * );
   * ```
   */
  update(triggerID, body, options) {
    return this._client.patch(path`/api/v3/trigger_instances/manage/${triggerID}`, { body, ...options });
  }
  /**
   * Permanently deletes a trigger instance. This stops the trigger from listening
   * for events and removes it from your project. Use the PATCH endpoint with status
   * "disable" if you want to temporarily pause a trigger instead.
   *
   * @example
   * ```ts
   * const manage = await client.triggerInstances.manage.delete(
   *   'triggerId',
   * );
   * ```
   */
  delete(triggerID, options) {
    return this._client.delete(path`/api/v3/trigger_instances/manage/${triggerID}`, options);
  }
};

// node_modules/@composio/client/resources/trigger-instances/trigger-instances.mjs
var TriggerInstances = class extends APIResource {
  static {
    __name(this, "TriggerInstances");
  }
  constructor() {
    super(...arguments);
    this.manage = new Manage(this._client);
  }
  /**
   * Retrieves all active trigger instances for your project. Triggers listen for
   * events from connected accounts (e.g., new emails, Slack messages, GitHub
   * commits) and can invoke webhooks or workflows. Use filters to find triggers for
   * specific users, connected accounts, or trigger types.
   *
   * @example
   * ```ts
   * const response = await client.triggerInstances.listActive();
   * ```
   */
  listActive(query = {}, options) {
    return this._client.get("/api/v3/trigger_instances/active", { query, ...options });
  }
  /**
   * Creates a new trigger instance or updates an existing one with the same
   * configuration. Triggers listen for events from external services (webhooks or
   * polling) and can invoke your workflows. If a matching trigger already exists and
   * is disabled, it will be re-enabled. Requires a connected account ID to associate
   * the trigger with a specific user connection.
   *
   * @example
   * ```ts
   * const response = await client.triggerInstances.upsert(
   *   'slug',
   * );
   * ```
   */
  upsert(slug, body = {}, options) {
    return this._client.post(path`/api/v3/trigger_instances/${slug}/upsert`, { body, ...options });
  }
};
TriggerInstances.Manage = Manage;

// node_modules/@composio/client/resources/triggers-types.mjs
init_esm();
var TriggersTypes = class extends APIResource {
  static {
    __name(this, "TriggersTypes");
  }
  /**
   * Retrieve detailed information about a specific trigger type using its slug
   * identifier
   */
  retrieve(slug, query = {}, options) {
    return this._client.get(path`/api/v3/triggers_types/${slug}`, { query, ...options });
  }
  /**
   * Retrieve a list of available trigger types with optional filtering by toolkit.
   * Results are paginated and can be filtered by toolkit.
   */
  list(query = {}, options) {
    return this._client.get("/api/v3/triggers_types", { query, ...options });
  }
  /**
   * Retrieves a list of all available trigger type enum values that can be used
   * across the API from latest versions of the toolkit only
   */
  retrieveEnum(options) {
    return this._client.get("/api/v3/triggers_types/list/enum", options);
  }
};

// node_modules/@composio/client/core/api-promise.mjs
init_esm();

// node_modules/@composio/client/internal/parse.mjs
init_esm();

// node_modules/@composio/client/internal/utils/log.mjs
init_esm();
var levelNumbers = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500
};
var parseLogLevel = /* @__PURE__ */ __name((maybeLevel, sourceName, client) => {
  if (!maybeLevel) {
    return void 0;
  }
  if (hasOwn(levelNumbers, maybeLevel)) {
    return maybeLevel;
  }
  loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
  return void 0;
}, "parseLogLevel");
function noop() {
}
__name(noop, "noop");
function makeLogFn(fnLevel, logger2, logLevel) {
  if (!logger2 || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
    return noop;
  } else {
    return logger2[fnLevel].bind(logger2);
  }
}
__name(makeLogFn, "makeLogFn");
var noopLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop
};
var cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client) {
  const logger2 = client.logger;
  const logLevel = client.logLevel ?? "off";
  if (!logger2) {
    return noopLogger;
  }
  const cachedLogger = cachedLoggers.get(logger2);
  if (cachedLogger && cachedLogger[0] === logLevel) {
    return cachedLogger[1];
  }
  const levelLogger = {
    error: makeLogFn("error", logger2, logLevel),
    warn: makeLogFn("warn", logger2, logLevel),
    info: makeLogFn("info", logger2, logLevel),
    debug: makeLogFn("debug", logger2, logLevel)
  };
  cachedLoggers.set(logger2, [logLevel, levelLogger]);
  return levelLogger;
}
__name(loggerFor, "loggerFor");
var formatRequestDetails = /* @__PURE__ */ __name((details) => {
  if (details.options) {
    details.options = { ...details.options };
    delete details.options["headers"];
  }
  if (details.headers) {
    details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [
      name,
      name.toLowerCase() === "x-api-key" || name.toLowerCase() === "authorization" || name.toLowerCase() === "cookie" || name.toLowerCase() === "set-cookie" ? "***" : value
    ]));
  }
  if ("retryOfRequestLogID" in details) {
    if (details.retryOfRequestLogID) {
      details.retryOf = details.retryOfRequestLogID;
    }
    delete details.retryOfRequestLogID;
  }
  return details;
}, "formatRequestDetails");

// node_modules/@composio/client/internal/parse.mjs
async function defaultParseResponse(client, props) {
  const { response, requestLogID, retryOfRequestLogID, startTime } = props;
  const body = await (async () => {
    if (response.status === 204) {
      return null;
    }
    if (props.options.__binaryResponse) {
      return response;
    }
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0]?.trim();
    const isJSON = mediaType?.includes("application/json") || mediaType?.endsWith("+json");
    if (isJSON) {
      const contentLength = response.headers.get("content-length");
      if (contentLength === "0") {
        return void 0;
      }
      const json = await response.json();
      return json;
    }
    const text = await response.text();
    return text;
  })();
  loggerFor(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails({
    retryOfRequestLogID,
    url: response.url,
    status: response.status,
    body,
    durationMs: Date.now() - startTime
  }));
  return body;
}
__name(defaultParseResponse, "defaultParseResponse");

// node_modules/@composio/client/core/api-promise.mjs
var _APIPromise_client;
var APIPromise = class _APIPromise extends Promise {
  static {
    __name(this, "APIPromise");
  }
  constructor(client, responsePromise, parseResponse2 = defaultParseResponse) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse2;
    _APIPromise_client.set(this, void 0);
    __classPrivateFieldSet(this, _APIPromise_client, client, "f");
  }
  _thenUnwrap(transform2) {
    return new _APIPromise(__classPrivateFieldGet(this, _APIPromise_client, "f"), this.responsePromise, async (client, props) => transform2(await this.parseResponse(client, props), props));
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  /**
   * Gets the parsed response data and the raw `Response` instance.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response };
  }
  parse() {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet(this, _APIPromise_client, "f"), data));
    }
    return this.parsedPromise;
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
};
_APIPromise_client = /* @__PURE__ */ new WeakMap();

// node_modules/@composio/client/internal/utils/env.mjs
init_esm();
var readEnv = /* @__PURE__ */ __name((env) => {
  if (typeof globalThis.process !== "undefined") {
    return globalThis.process.env?.[env]?.trim() ?? void 0;
  }
  if (typeof globalThis.Deno !== "undefined") {
    return globalThis.Deno.env?.get?.(env)?.trim();
  }
  return void 0;
}, "readEnv");

// node_modules/@composio/client/client.mjs
var _Composio_instances;
var _a;
var _Composio_encoder;
var _Composio_baseURLOverridden;
var environments = {
  production: "https://backend.composio.dev",
  staging: "https://staging-backend.composio.dev",
  local: "http://localhost:9900"
};
var Composio = class {
  static {
    __name(this, "Composio");
  }
  /**
   * API Client for interfacing with the Composio API.
   *
   * @param {string | null | undefined} [opts.apiKey=process.env['COMPOSIO_API_KEY'] ?? null]
   * @param {Environment} [opts.environment=production] - Specifies the environment URL to use for the API.
   * @param {string} [opts.baseURL=process.env['COMPOSIO_BASE_URL'] ?? https://backend.composio.dev] - Override the default base URL for the API.
   * @param {number} [opts.timeout=1 minute] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
   */
  constructor({ baseURL = readEnv("COMPOSIO_BASE_URL"), apiKey = readEnv("COMPOSIO_API_KEY") ?? null, ...opts } = {}) {
    _Composio_instances.add(this);
    _Composio_encoder.set(this, void 0);
    this.authConfigs = new AuthConfigs(this);
    this.connectedAccounts = new ConnectedAccounts(this);
    this.link = new Link(this);
    this.toolkits = new Toolkits(this);
    this.tools = new Tools2(this);
    this.triggerInstances = new TriggerInstances(this);
    this.triggersTypes = new TriggersTypes(this);
    this.mcp = new Mcp(this);
    this.files = new Files(this);
    this.migration = new Migration(this);
    this.cli = new Cli(this);
    this.project = new Project(this);
    this.logs = new Logs(this);
    this.toolRouter = new ToolRouter(this);
    const options = {
      apiKey,
      ...opts,
      baseURL,
      environment: opts.environment ?? "production"
    };
    if (baseURL && opts.environment) {
      throw new ComposioError("Ambiguous URL; The `baseURL` option (or COMPOSIO_BASE_URL env var) and the `environment` option are given. If you want to use the environment you must pass baseURL: null");
    }
    this.baseURL = options.baseURL || environments[options.environment || "production"];
    this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT;
    this.logger = options.logger ?? console;
    const defaultLogLevel = "warn";
    this.logLevel = defaultLogLevel;
    this.logLevel = parseLogLevel(options.logLevel, "ClientOptions.logLevel", this) ?? parseLogLevel(readEnv("COMPOSIO_LOG"), "process.env['COMPOSIO_LOG']", this) ?? defaultLogLevel;
    this.fetchOptions = options.fetchOptions;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetch = options.fetch ?? getDefaultFetch();
    __classPrivateFieldSet(this, _Composio_encoder, FallbackEncoder, "f");
    this._options = options;
    this.apiKey = apiKey;
  }
  /**
   * Create a new client instance re-using the same options given to the current client with optional overriding.
   */
  withOptions(options) {
    const client = new this.constructor({
      ...this._options,
      environment: options.environment ? options.environment : void 0,
      baseURL: options.environment ? void 0 : this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      ...options
    });
    return client;
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values, nulls }) {
    return;
  }
  async authHeaders(opts) {
    if (this.apiKey == null) {
      return void 0;
    }
    return buildHeaders([{ "x-api-key": this.apiKey }]);
  }
  stringifyQuery(query) {
    return stringify(query, { arrayFormat: "comma" });
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${VERSION}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${uuid4()}`;
  }
  makeStatusError(status, error, message, headers) {
    return APIError.generate(status, error, message, headers);
  }
  buildURL(path4, query, defaultBaseURL) {
    const baseURL = !__classPrivateFieldGet(this, _Composio_instances, "m", _Composio_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
    const url = isAbsoluteURL(path4) ? new URL(path4) : new URL(baseURL + (baseURL.endsWith("/") && path4.startsWith("/") ? path4.slice(1) : path4));
    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj(defaultQuery)) {
      query = { ...defaultQuery, ...query };
    }
    if (typeof query === "object" && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query);
    }
    return url.toString();
  }
  /**
   * Used as a callback for mutating the given `FinalRequestOptions` object.
   */
  async prepareOptions(options) {
  }
  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  async prepareRequest(request, { url, options }) {
  }
  get(path4, opts) {
    return this.methodRequest("get", path4, opts);
  }
  post(path4, opts) {
    return this.methodRequest("post", path4, opts);
  }
  patch(path4, opts) {
    return this.methodRequest("patch", path4, opts);
  }
  put(path4, opts) {
    return this.methodRequest("put", path4, opts);
  }
  delete(path4, opts) {
    return this.methodRequest("delete", path4, opts);
  }
  methodRequest(method, path4, opts) {
    return this.request(Promise.resolve(opts).then((opts2) => {
      return { method, path: path4, ...opts2 };
    }));
  }
  request(options, remainingRetries = null) {
    return new APIPromise(this, this.makeRequest(options, remainingRetries, void 0));
  }
  async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }
    await this.prepareOptions(options);
    const { req, url, timeout } = await this.buildRequest(options, {
      retryCount: maxRetries - retriesRemaining
    });
    await this.prepareRequest(req, { url, options });
    const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
    const retryLogStr = retryOfRequestLogID === void 0 ? "" : `, retryOf: ${retryOfRequestLogID}`;
    const startTime = Date.now();
    loggerFor(this).debug(`[${requestLogID}] sending request`, formatRequestDetails({
      retryOfRequestLogID,
      method: options.method,
      url,
      options,
      headers: req.headers
    }));
    if (options.signal?.aborted) {
      throw new APIUserAbortError();
    }
    const controller = new AbortController();
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
    const headersTime = Date.now();
    if (response instanceof globalThis.Error) {
      const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
      if (options.signal?.aborted) {
        throw new APIUserAbortError();
      }
      const isTimeout = isAbortError(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
      if (retriesRemaining) {
        loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
        loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails({
          retryOfRequestLogID,
          url,
          durationMs: headersTime - startTime,
          message: response.message
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
      }
      loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
      loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails({
        retryOfRequestLogID,
        url,
        durationMs: headersTime - startTime,
        message: response.message
      }));
      if (isTimeout) {
        throw new APIConnectionTimeoutError();
      }
      throw new APIConnectionError({ cause: response });
    }
    const responseInfo = `[${requestLogID}${retryLogStr}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
    if (!response.ok) {
      const shouldRetry = await this.shouldRetry(response);
      if (retriesRemaining && shouldRetry) {
        const retryMessage2 = `retrying, ${retriesRemaining} attempts remaining`;
        await CancelReadableStream(response.body);
        loggerFor(this).info(`${responseInfo} - ${retryMessage2}`);
        loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage2})`, formatRequestDetails({
          retryOfRequestLogID,
          url: response.url,
          status: response.status,
          headers: response.headers,
          durationMs: headersTime - startTime
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
      }
      const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
      loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
      const errText = await response.text().catch((err2) => castToError(err2).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? void 0 : errText;
      loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        headers: response.headers,
        message: errMessage,
        durationMs: Date.now() - startTime
      }));
      const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
      throw err;
    }
    loggerFor(this).info(responseInfo);
    loggerFor(this).debug(`[${requestLogID}] response start`, formatRequestDetails({
      retryOfRequestLogID,
      url: response.url,
      status: response.status,
      headers: response.headers,
      durationMs: headersTime - startTime
    }));
    return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
  }
  async fetchWithTimeout(url, init, ms, controller) {
    const { signal, method, ...options } = init || {};
    const abort = this._makeAbort(controller);
    if (signal)
      signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, ms);
    const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
    const fetchOptions = {
      signal: controller.signal,
      ...isReadableBody ? { duplex: "half" } : {},
      method: "GET",
      ...options
    };
    if (method) {
      fetchOptions.method = method.toUpperCase();
    }
    try {
      return await this.fetch.call(void 0, url, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }
  }
  async shouldRetry(response) {
    const shouldRetryHeader = response.headers.get("x-should-retry");
    if (shouldRetryHeader === "true")
      return true;
    if (shouldRetryHeader === "false")
      return false;
    if (response.status === 408)
      return true;
    if (response.status === 409)
      return true;
    if (response.status === 429)
      return true;
    if (response.status >= 500)
      return true;
    return false;
  }
  async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
    let timeoutMillis;
    const retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }
    const retryAfterHeader = responseHeaders?.get("retry-after");
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1e3;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }
    if (!(timeoutMillis && 0 <= timeoutMillis && timeoutMillis < 60 * 1e3)) {
      const maxRetries = options.maxRetries ?? this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep(timeoutMillis);
    return this.makeRequest(options, retriesRemaining - 1, requestLogID);
  }
  calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 8;
    const numRetries = maxRetries - retriesRemaining;
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
    const jitter = 1 - Math.random() * 0.25;
    return sleepSeconds * jitter * 1e3;
  }
  async buildRequest(inputOptions, { retryCount = 0 } = {}) {
    const options = { ...inputOptions };
    const { method, path: path4, query, defaultBaseURL } = options;
    const url = this.buildURL(path4, query, defaultBaseURL);
    if ("timeout" in options)
      validatePositiveInteger("timeout", options.timeout);
    options.timeout = options.timeout ?? this.timeout;
    const { bodyHeaders, body } = this.buildBody({ options });
    const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
    const req = {
      method,
      headers: reqHeaders,
      ...options.signal && { signal: options.signal },
      ...globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" },
      ...body && { body },
      ...this.fetchOptions ?? {},
      ...options.fetchOptions ?? {}
    };
    return { req, url, timeout: options.timeout };
  }
  async buildHeaders({ options, method, bodyHeaders, retryCount }) {
    let idempotencyHeaders = {};
    if (this.idempotencyHeader && method !== "get") {
      if (!options.idempotencyKey)
        options.idempotencyKey = this.defaultIdempotencyKey();
      idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
    }
    const headers = buildHeaders([
      idempotencyHeaders,
      {
        Accept: "application/json",
        "User-Agent": this.getUserAgent(),
        "X-Stainless-Retry-Count": String(retryCount),
        ...options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1e3)) } : {},
        ...getPlatformHeaders()
      },
      await this.authHeaders(options),
      this._options.defaultHeaders,
      bodyHeaders,
      options.headers
    ]);
    this.validateHeaders(headers);
    return headers.values;
  }
  _makeAbort(controller) {
    return () => controller.abort();
  }
  buildBody({ options: { body, headers: rawHeaders } }) {
    if (!body) {
      return { bodyHeaders: void 0, body: void 0 };
    }
    const headers = buildHeaders([rawHeaders]);
    if (
      // Pass raw type verbatim
      ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === "string" && // Preserve legacy string encoding behavior for now
      headers.values.has("content-type") || // `Blob` is superset of `File`
      globalThis.Blob && body instanceof globalThis.Blob || // `FormData` -> `multipart/form-data`
      body instanceof FormData || // `URLSearchParams` -> `application/x-www-form-urlencoded`
      body instanceof URLSearchParams || // Send chunked stream (each chunk has own `length`)
      globalThis.ReadableStream && body instanceof globalThis.ReadableStream
    ) {
      return { bodyHeaders: void 0, body };
    } else if (typeof body === "object" && (Symbol.asyncIterator in body || Symbol.iterator in body && "next" in body && typeof body.next === "function")) {
      return { bodyHeaders: void 0, body: ReadableStreamFrom(body) };
    } else if (typeof body === "object" && headers.values.get("content-type") === "application/x-www-form-urlencoded") {
      return {
        bodyHeaders: { "content-type": "application/x-www-form-urlencoded" },
        body: this.stringifyQuery(body)
      };
    } else {
      return __classPrivateFieldGet(this, _Composio_encoder, "f").call(this, { body, headers });
    }
  }
};
_a = Composio, _Composio_encoder = /* @__PURE__ */ new WeakMap(), _Composio_instances = /* @__PURE__ */ new WeakSet(), _Composio_baseURLOverridden = /* @__PURE__ */ __name(function _Composio_baseURLOverridden2() {
  return this.baseURL !== environments[this._options.environment || "production"];
}, "_Composio_baseURLOverridden");
Composio.Composio = _a;
Composio.DEFAULT_TIMEOUT = 6e4;
Composio.ComposioError = ComposioError;
Composio.APIError = APIError;
Composio.APIConnectionError = APIConnectionError;
Composio.APIConnectionTimeoutError = APIConnectionTimeoutError;
Composio.APIUserAbortError = APIUserAbortError;
Composio.NotFoundError = NotFoundError;
Composio.ConflictError = ConflictError;
Composio.RateLimitError = RateLimitError;
Composio.BadRequestError = BadRequestError;
Composio.AuthenticationError = AuthenticationError;
Composio.InternalServerError = InternalServerError;
Composio.PermissionDeniedError = PermissionDeniedError;
Composio.UnprocessableEntityError = UnprocessableEntityError;
Composio.toFile = toFile;
Composio.AuthConfigs = AuthConfigs;
Composio.ConnectedAccounts = ConnectedAccounts;
Composio.Link = Link;
Composio.Toolkits = Toolkits;
Composio.Tools = Tools2;
Composio.TriggerInstances = TriggerInstances;
Composio.TriggersTypes = TriggersTypes;
Composio.Mcp = Mcp;
Composio.Files = Files;
Composio.Migration = Migration;
Composio.Cli = Cli;
Composio.Project = Project;
Composio.Logs = Logs;
Composio.ToolRouter = ToolRouter;

// node_modules/@composio/core/dist/buffer-BFpVRahf.mjs
var import_chalk = __toESM(require_source(), 1);
var getEnvVariable = /* @__PURE__ */ __name((name, defaultValue = void 0) => {
  try {
    return process.env[name] || defaultValue;
  } catch (_e) {
    return defaultValue;
  }
}, "getEnvVariable");
var getEnvsWithPrefix = /* @__PURE__ */ __name((prefix) => {
  try {
    if (process && process.env) return Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith(prefix)));
    else return {};
  } catch (error) {
    return {};
  }
}, "getEnvsWithPrefix");
var constants_exports = /* @__PURE__ */ __exportAll({
  CLIENT_PUSHER_KEY: /* @__PURE__ */ __name(() => CLIENT_PUSHER_KEY, "CLIENT_PUSHER_KEY"),
  COMPOSIO_DIR: /* @__PURE__ */ __name(() => COMPOSIO_DIR, "COMPOSIO_DIR"),
  COMPOSIO_LOG_LEVEL: /* @__PURE__ */ __name(() => COMPOSIO_LOG_LEVEL, "COMPOSIO_LOG_LEVEL"),
  DEFAULT_BASE_URL: /* @__PURE__ */ __name(() => DEFAULT_BASE_URL, "DEFAULT_BASE_URL"),
  DEFAULT_WEB_URL: /* @__PURE__ */ __name(() => DEFAULT_WEB_URL, "DEFAULT_WEB_URL"),
  IS_DEVELOPMENT_OR_CI: /* @__PURE__ */ __name(() => IS_DEVELOPMENT_OR_CI, "IS_DEVELOPMENT_OR_CI"),
  TELEMETRY_URL: /* @__PURE__ */ __name(() => TELEMETRY_URL, "TELEMETRY_URL"),
  TEMP_FILES_DIRECTORY_NAME: /* @__PURE__ */ __name(() => TEMP_FILES_DIRECTORY_NAME, "TEMP_FILES_DIRECTORY_NAME"),
  USER_DATA_FILE_NAME: /* @__PURE__ */ __name(() => USER_DATA_FILE_NAME, "USER_DATA_FILE_NAME")
});
var COMPOSIO_DIR = ".composio";
var USER_DATA_FILE_NAME = "user_data.json";
var TEMP_FILES_DIRECTORY_NAME = "files";
var DEFAULT_BASE_URL = "https://backend.composio.dev";
var DEFAULT_WEB_URL = "https://platform.composio.dev";
var TELEMETRY_URL = "https://app.composio.dev";
var CLIENT_PUSHER_KEY = getEnvVariable("CLIENT_PUSHER_KEY") || "ff9f18c208855d77a152";
var COMPOSIO_LOG_LEVEL = getEnvVariable("COMPOSIO_LOG_LEVEL");
var IS_DEVELOPMENT_OR_CI = getEnvVariable("DEVELOPMENT") || getEnvVariable("CI") || false;
var LOG_LEVELS = {
  silent: -1,
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};
var getLogLevel = /* @__PURE__ */ __name(() => {
  const envLevel = (COMPOSIO_LOG_LEVEL ?? "info")?.toLowerCase();
  return envLevel && envLevel in LOG_LEVELS ? envLevel : "info";
}, "getLogLevel");
var Logger = class {
  static {
    __name(this, "Logger");
  }
  level;
  includeTimestamp;
  console;
  constructor(options = {}) {
    this.level = options.level ?? getLogLevel();
    this.includeTimestamp = options.includeTimestamp ?? true;
    this.console = console;
  }
  formatMessage(args) {
    const formattedArgs = args.map((arg, index) => {
      if (typeof arg === "object") return JSON.stringify(arg);
      else {
        if (index === 0) if (args.length > 1) return import_chalk.default.yellow(`${arg}`);
        else return String(arg);
        return String(arg);
      }
    }).join("\n");
    if (!this.includeTimestamp) return formattedArgs;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    return `${import_chalk.default.gray(timestamp)} - ${formattedArgs}`;
  }
  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }
  error(...args) {
    if (this.shouldLog("error")) this.console.error(this.formatMessage(args));
  }
  warn(...args) {
    if (this.shouldLog("warn")) this.console.warn(this.formatMessage(args));
  }
  info(...args) {
    if (this.shouldLog("info")) this.console.info(this.formatMessage(args));
  }
  debug(...args) {
    if (this.shouldLog("debug")) this.console.debug(this.formatMessage(args));
  }
};
var logger = new Logger();
var logger_default = logger;
var ComposioError$1 = class ComposioError$12 extends Error {
  static {
    __name(this, "ComposioError$1");
  }
  /** @readonly Error name */
  name = "ComposioError";
  code;
  possibleFixes;
  errorId;
  /**
  * Creates a new ComposioError
  * @param message Error message
  * @param options Additional error options
  */
  constructor(message, options = {}) {
    super(message);
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    const statusCode = options.statusCode || (options.cause instanceof BadRequestError ? options.cause.status : void 0);
    this.code = `TS-SDK::${options.code}`;
    this.possibleFixes = options.possibleFixes;
    this.definePropertyIfExists("statusCode", statusCode);
    this.definePropertyIfExists("cause", options.cause);
    const combinedStack = options.cause instanceof Error ? ComposioError$12.combineStackTraces(options.cause.stack, this.stack) : options.stack ?? this.stack;
    this.definePropertyIfExists("stack", combinedStack);
    if (options.meta && Object.keys(options.meta).length > 0) this.definePropertyIfExists("meta", options.meta);
  }
  /**
  * Helper method to define a property only if it has a value
  * @param propertyName Name of the property to define
  * @param value Value to assign to the property
  * @private
  */
  definePropertyIfExists(propertyName, value) {
    if (value !== void 0) Object.defineProperty(this, propertyName, {
      value,
      enumerable: true,
      writable: false,
      configurable: true
    });
  }
  /**
  * Helper method to combine stack traces when wrapping errors
  * This ensures the full call chain is preserved
  * @param originalStack The stack of the error being wrapped
  * @param currentStack The stack of the wrapper error
  * @returns Combined stack trace
  * @private
  */
  static combineStackTraces(originalStack, currentStack) {
    if (!originalStack) return currentStack;
    if (!currentStack) return originalStack;
    const currentHeader = currentStack.split("\n")[0];
    const originalStackBody = originalStack.split("\n").slice(1).join("\n");
    return `${currentHeader}
${currentStack.split("\n").slice(1).join("\n")}

Caused by:
${originalStackBody}`;
  }
  /**
  * Extract and normalize error data for formatting
  * @param includeStack Whether to include stack trace information
  * @returns Structured error data for formatting
  * @private
  */
  getErrorData(includeStack = false) {
    const data = {
      name: this.name,
      message: this.message
    };
    const { cause, code, stack, statusCode, meta, possibleFixes } = this;
    if (cause !== void 0) {
      const rawCause = cause;
      data.cause = rawCause instanceof Error ? rawCause.message : String(rawCause);
    }
    if (code) data.code = code;
    if (statusCode !== void 0) data.statusCode = statusCode;
    if (meta) data.meta = meta;
    if (possibleFixes) data.possibleFixes = possibleFixes;
    if (includeStack && stack) if (stack.includes("Caused by:")) {
      const [currentStack, causeStack] = stack.split("Caused by:");
      data.stack = [
        ...currentStack.split("\n").slice(1),
        "Caused by:",
        ...causeStack.split("\n")
      ];
    } else data.stack = stack.split("\n").slice(1);
    return data;
  }
  /**
  * Prints a user-friendly, colorful representation of the error to the logger
  * @param includeStack Whether to include the stack trace in the output (default: false)
  */
  prettyPrint(includeStack = false) {
    const data = this.getErrorData(includeStack);
    let output = "\n" + import_chalk.default.bgRed.white.bold(" ERROR ") + " " + import_chalk.default.white.bold(data.message) + "\n";
    if (data.code) output += import_chalk.default.yellow(`Error Code: ${data.code}`) + "\n";
    if (data.statusCode !== void 0) output += import_chalk.default.yellow(`Status: ${data.statusCode}`) + "\n";
    if (data.cause) {
      output += import_chalk.default.gray("Reason:") + "\n";
      output += "  " + import_chalk.default.white(data.cause) + "\n";
    }
    if (data.meta) {
      output += import_chalk.default.gray("Additional Information:") + "\n";
      output += "  " + import_chalk.default.white(JSON.stringify(data.meta, null, 2).replace(/\n/g, "\n  ")) + "\n";
    }
    if (data.possibleFixes?.length) {
      output += "\n" + import_chalk.default.cyan.bold("Try the following:") + "\n";
      const fixes = data.possibleFixes?.map((fix, index) => ` ${index + 1}. ` + import_chalk.default.white(fix));
      output += fixes?.join("\n") + "\n";
    }
    if (data.stack?.length) {
      output += "\n" + import_chalk.default.gray("Stack Trace:") + "\n";
      output += import_chalk.default.gray(data.stack.join("\n")) + "\n";
    }
    output += "\n";
    logger_default.error(output);
  }
  /**
  * Static factory method to create and pretty print an error in one step
  * @param message Error message
  * @param options Error options
  * @param includeStack Whether to include the stack trace in the output
  * @returns The created error instance
  */
  static createAndPrint(message, options = {}, includeStack = false) {
    const error = new ComposioError$12(message, options);
    error.prettyPrint(includeStack);
    return error;
  }
  /**
  * Utility function to handle errors in a consistent way
  * This properly displays the error without throwing
  * @param error The error to handle
  * @param options Options for error handling
  */
  static handle(error, options = {}) {
    const { includeStack = false, exitProcess = false } = options;
    if (error instanceof ComposioError$12) error.prettyPrint(includeStack);
    else if (error instanceof ZodError) this.handleZodError(error, includeStack);
    else if (error instanceof Error) this.handleStandardError(error, includeStack);
    else this.handleUnknownError(error);
    if (exitProcess) this.throwError(error);
  }
  /**
  * Utility function to handle errors and then throw them
  * This properly displays the error and then throws it, allowing callers to catch it.
  * Use this for fatal errors that should stop execution.
  * @param error The error to handle and throw
  * @param includeStack Whether to include the stack trace in the output
  * @throws ComposioError - Always throws after displaying the error
  */
  static handleAndThrow(error, includeStack = false) {
    this.handle(error, { includeStack });
    this.throwError(error);
  }
  /**
  * Helper method to throw an error as a ComposioError
  * @param error The error to throw
  * @private
  */
  static throwError(error) {
    if (error instanceof ComposioError$12) throw error;
    else if (error instanceof Error) throw new ComposioError$12(error.message, { cause: error });
    else throw new ComposioError$12(String(error));
  }
  /**
  * Helper method to handle Zod validation errors
  * @param error The Zod error to handle
  * @param includeStack Whether to include the stack trace
  * @private
  */
  static handleZodError(error, includeStack) {
    logger_default.error("\n" + import_chalk.default.bgRed.white.bold(" ERROR ") + " " + import_chalk.default.white.bold(error.message));
    logger_default.error(import_chalk.default.gray("Invalid parameters:"));
    error.errors.forEach((err) => {
      logger_default.error(import_chalk.default.yellow(err.path.join(".")) + " " + import_chalk.default.white(err.message));
    });
    logger_default.error(import_chalk.default.gray("Expected parameters:"));
    error.errors.forEach((err) => {
      logger_default.error(import_chalk.default.yellow(err.path.join(".")) + " " + import_chalk.default.white(err.message));
    });
    if (includeStack) {
      logger_default.error("\n" + import_chalk.default.gray("Validation Errors:"));
      error.errors.forEach((err) => {
        const path4 = err.path.join(".");
        logger_default.error(import_chalk.default.gray("  • ") + import_chalk.default.yellow(path4 ? `${path4}: ` : "") + import_chalk.default.white(err.message));
      });
      if (error.stack) {
        logger_default.error("\n" + import_chalk.default.gray("Stack Trace:"));
        const stackLines = error.stack.split("\n").slice(1);
        logger_default.error(import_chalk.default.gray(stackLines.join("\n")));
      }
    }
    logger_default.error("");
  }
  /**
  * Helper method to handle standard Error objects
  * @param error The standard error to handle
  * @param includeStack Whether to include the stack trace
  * @private
  */
  static handleStandardError(error, includeStack) {
    logger_default.error("\n" + import_chalk.default.bgRed.white.bold(" ERROR ") + " " + import_chalk.default.white.bold(error.message));
    if (includeStack && error.stack) {
      logger_default.error("\n" + import_chalk.default.gray("Stack Trace:"));
      const stackLines = error.stack.split("\n").slice(1);
      logger_default.error(import_chalk.default.gray(stackLines.join("\n")));
    }
    logger_default.error("");
  }
  /**
  * Helper method to handle unknown error types
  * @param error The unknown error value
  * @private
  */
  static handleUnknownError(error) {
    logger_default.error("\n" + import_chalk.default.bgRed.white.bold(" ERROR ") + " " + import_chalk.default.white.bold("Unknown error occurred"));
    if (error !== null && error !== void 0) {
      logger_default.error(import_chalk.default.gray("Error details:"));
      logger_default.error("  " + import_chalk.default.white(String(error)));
    }
    logger_default.error("");
  }
};
function getRandomUUID() {
  return globalThis.crypto.randomUUID();
}
__name(getRandomUUID, "getRandomUUID");
function getRandomShortId() {
  return getRandomUUID().slice(0, 8).replace(/-/g, "");
}
__name(getRandomShortId, "getRandomShortId");
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
__name(arrayBufferToBase64, "arrayBufferToBase64");
var base64ToUint8Array = /* @__PURE__ */ __name((base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}, "base64ToUint8Array");
var uint8ArrayToBase64 = /* @__PURE__ */ __name((bytes) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}, "uint8ArrayToBase64");

// node_modules/@composio/core/dist/Telemetry-B3HlLpMT.mjs
init_esm();
var TELEMETRY_EVENTS = {
  SDK_INITIALIZED: "SDK_INITIALIZED",
  SDK_METHOD_INVOKED: "SDK_METHOD_INVOKED",
  SDK_METHOD_ERROR: "SDK_METHOD_ERROR",
  CLI_INVOKED: "CLI_INVOKED"
};
var BatchProcessor = class {
  static {
    __name(this, "BatchProcessor");
  }
  batch = [];
  time;
  batchSize;
  processBatchCallback;
  timer = null;
  pendingBatches = /* @__PURE__ */ new Set();
  constructor(time = 2e3, batchSize = 100, processBatchCallback) {
    this.batch = [];
    this.time = time;
    this.batchSize = batchSize;
    this.processBatchCallback = processBatchCallback;
  }
  pushItem(item) {
    this.batch.push(item);
    if (this.batch.length >= this.batchSize) this.processBatch();
    else if (!this.timer) this.timer = setTimeout(() => this.processBatch(), this.time);
  }
  processBatch() {
    if (this.batch.length > 0) {
      const batchToProcess = this.batch;
      this.batch = [];
      const pending = this.processBatchCallback(batchToProcess).catch(() => {
      }).finally(() => {
        this.pendingBatches.delete(pending);
      });
      this.pendingBatches.add(pending);
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  /**
  * Flush any pending batches and wait for all of them to complete.
  * Useful for ensuring telemetry is sent before process exit.
  */
  async flush() {
    this.processBatch();
    if (this.pendingBatches.size > 0) await Promise.all(this.pendingBatches);
  }
};
var TELEMETRY_URL2 = "https://telemetry.composio.dev/v1";
var TelemetryService = class {
  static {
    __name(this, "TelemetryService");
  }
  /**
  * Sends a metric to the Telemetry API.
  * @param payload - The payload to send to the Telemetry API.
  * @returns The response from the Telemetry API.
  */
  static async sendMetric(payload) {
    try {
      return await fetch(`${TELEMETRY_URL2}/metrics/invocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      logger_default.debug("Error sending metric telemetry", error);
    }
  }
  /**
  * Sends an error log to the Telemetry API.
  * @param payload - The payload to send to the Telemetry API.
  * @returns The response from the Telemetry API.
  */
  static async sendErrorLog(payload) {
    try {
      return await fetch(`${TELEMETRY_URL2}/errors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      logger_default.debug("Error sending error telemetry", error);
    }
  }
};
var TelemetryTransport = class {
  static {
    __name(this, "TelemetryTransport");
  }
  telemetryMetadata;
  isTelemetryDisabled = true;
  telemetrySource;
  telemetrySourceName = "typescript-sdk";
  telemetryServiceName = "sdk";
  telemetryLanguage = "typescript";
  exitHandlersRegistered = false;
  batchProcessor = new BatchProcessor(200, 10, async (data) => {
    logger_default.debug("Sending batch of telemetry metrics", data);
    await TelemetryService.sendMetric(data);
  });
  setup(metadata) {
    this.telemetryMetadata = metadata;
    this.isTelemetryDisabled = false;
    this.telemetrySource = {
      host: this.telemetryMetadata?.host ?? this.telemetrySourceName,
      service: this.telemetryServiceName,
      language: this.telemetryLanguage,
      version: this.telemetryMetadata?.version,
      platform: this.telemetryMetadata?.isBrowser ? "browser" : "node",
      environment: getEnvVariable("NODE_ENV", "production")
    };
    this.registerExitHandlers();
    this.sendMetric([{
      functionName: TELEMETRY_EVENTS.SDK_INITIALIZED,
      durationMs: 0,
      timestamp: Date.now() / 1e3,
      props: {},
      source: this.telemetrySource,
      metadata: { provider: this.telemetryMetadata?.provider ?? "openai" },
      error: void 0
    }]);
  }
  /**
  * Instrument the telemetry for the given instance.
  *
  * You can pass the instance and the file name of the instance to instrument the telemetry.
  * This will instrument all the methods of the instance and log the telemetry for each method call.
  * @param instance - any instance that extends InstrumentedInstance
  * @param fileName - the file name of the instance
  * @returns
  */
  instrument(instance, fileName) {
    const proto = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(proto).filter((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(proto, key);
      return key !== "constructor" && descriptor && typeof descriptor.value === "function" && descriptor.value.constructor.name === "AsyncFunction";
    });
    const instrumentedClassName = fileName ?? instance.constructor?.name ?? "unknown";
    for (const name of methodNames) {
      const originalMethod = instance[name];
      instance[name] = async (...args) => {
        const telemetryEnabled = this.shouldSendTelemetry();
        const startTime = telemetryEnabled ? Date.now() : void 0;
        try {
          const result = await originalMethod.apply(instance, args);
          if (telemetryEnabled && startTime !== void 0) {
            const durationMs = Date.now() - startTime;
            const telemetryPayload = {
              functionName: `${instrumentedClassName}.${name}`,
              durationMs,
              timestamp: startTime / 1e3,
              props: {
                fileName: instrumentedClassName,
                method: name
              },
              metadata: { provider: this.telemetryMetadata?.provider ?? "openai" },
              error: void 0,
              source: this.telemetrySource
            };
            this.batchProcessor.pushItem(telemetryPayload);
          }
          return result;
        } catch (error) {
          if (error instanceof Error) {
            if (!error.errorId) {
              error.errorId = getRandomUUID();
              if (telemetryEnabled && startTime !== void 0) {
                const durationMs = Date.now() - startTime;
                await this.prepareAndSendErrorTelemetry(error, instrumentedClassName, name, startTime, durationMs);
              }
            }
          }
          throw error;
        }
      };
    }
    return instance;
  }
  /**
  * Check if the telemetry should be sent.
  * @returns true if the telemetry should be sent, false otherwise
  */
  shouldSendTelemetry() {
    const telemetryDisabledEnvironments = ["test", "ci"];
    const nodeEnv = (getEnvVariable("NODE_ENV", "development") || "").toLowerCase();
    const isDisabledEnvironment = telemetryDisabledEnvironments.includes(nodeEnv);
    const isTelemetryDisabledByEnv = getEnvVariable("TELEMETRY_DISABLED", "false") === "true";
    return !this.isTelemetryDisabled && !isTelemetryDisabledByEnv && !isDisabledEnvironment;
  }
  /**
  * Prepare and send the error telemetry.
  *
  * @TODO This currently blocks the thread and sends the telemetry to the server.
  *
  * @param {unknown} error - The error to send.
  * @param {string} instrumentedClassName - The class name of the instrumented class.
  * @param {string} name - The name of the method that threw the error.
  * @param {number} startTime - The start time of the method invocation in milliseconds.
  * @param {number} durationMs - The duration of the method invocation in milliseconds.
  */
  async prepareAndSendErrorTelemetry(error, instrumentedClassName, name, startTime, durationMs) {
    const telemetryPayload = {
      functionName: `${instrumentedClassName}.${name}`,
      durationMs,
      timestamp: startTime / 1e3,
      props: {
        fileName: instrumentedClassName,
        method: name
      },
      metadata: { provider: this.telemetryMetadata?.provider ?? "openai" },
      source: this.telemetrySource
    };
    if (error instanceof ComposioError) telemetryPayload.error = {
      errorId: error.errorId,
      name: error.name,
      message: error.message,
      stack: error.stack
    };
    else if (error instanceof ComposioError$1) telemetryPayload.error = {
      errorId: error.errorId,
      name: error.name,
      code: error.code,
      message: error.message,
      stack: error.stack
    };
    else if (error instanceof Error) telemetryPayload.error = {
      errorId: error.errorId,
      name: error.name ?? "Unknown error",
      message: error.message,
      stack: error.stack
    };
    await this.sendErrorTelemetry(telemetryPayload);
  }
  /**
  * Send the telemetry payload to the server.
  * @param payload - the telemetry payload to send
  * @returns
  */
  async sendMetric(payload) {
    if (!this.shouldSendTelemetry()) {
      logger_default.debug("Telemetry is disabled, skipping metric telemetry", payload);
      return;
    }
    try {
      logger_default.debug("SDK Metric", payload);
      await TelemetryService.sendMetric(payload);
    } catch (error) {
      logger_default.error("Error sending metric telemetry", error);
    }
  }
  async sendErrorTelemetry(payload) {
    if (!this.shouldSendTelemetry()) {
      logger_default.debug("Telemetry is disabled, skipping metric telemetry", payload);
      return;
    }
    try {
      logger_default.debug("SDK Error Telemetry", payload);
      await TelemetryService.sendErrorLog(payload);
    } catch (error) {
      logger_default.error("Error sending error telemetry", error);
    }
  }
  /**
  * Flush any pending telemetry and wait for it to complete.
  * This is automatically called on process exit in Node.js environments.
  */
  async flush() {
    await this.batchProcessor.flush();
  }
  /**
  * Register process exit handlers to automatically flush telemetry.
  * Only registers handlers in Node.js environments (not in browsers).
  */
  registerExitHandlers() {
    if (this.exitHandlersRegistered || typeof process === "undefined" || !process.on) return;
    this.exitHandlersRegistered = true;
    const flushSync = /* @__PURE__ */ __name(() => {
      this.flush().catch((error) => {
        logger_default.debug("Error flushing telemetry on exit", error);
      });
    }, "flushSync");
    process.on("beforeExit", () => {
      flushSync();
    });
    const createSignalHandler = /* @__PURE__ */ __name((signal) => {
      const handler = /* @__PURE__ */ __name(() => {
        logger_default.debug(`Received ${signal}, flushing telemetry...`);
        this.flush().catch((error) => {
          logger_default.debug("Error flushing telemetry on signal", error);
        }).finally(() => {
          process.removeListener(signal, handler);
          process.kill(process.pid, signal);
        });
      }, "handler");
      return handler;
    }, "createSignalHandler");
    process.on("SIGINT", createSignalHandler("SIGINT"));
    process.on("SIGTERM", createSignalHandler("SIGTERM"));
  }
};
var telemetry = new TelemetryTransport();

// node_modules/@composio/core/dist/utils/modifiers/FileToolModifier.node.mjs
init_esm();

// node_modules/@composio/core/dist/fileUtils.node-MOEGtpnI.mjs
init_esm();

// node_modules/@composio/core/dist/platform/node.mjs
init_esm();
import * as fs from "node:fs";
import * as os from "node:os";
import * as path2 from "node:path";
var platform = {
  supportsFileSystem: true,
  homedir() {
    try {
      return os.homedir();
    } catch {
      return null;
    }
  },
  joinPath(...paths) {
    return path2.join(...paths);
  },
  basename(filePath) {
    return path2.basename(filePath);
  },
  existsSync(filePath) {
    return fs.existsSync(filePath);
  },
  mkdirSync(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
  },
  readFileSync(filePath, encoding) {
    if (encoding === void 0) {
      const buf = fs.readFileSync(filePath, { encoding: null });
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    return fs.readFileSync(filePath, { encoding });
  },
  writeFileSync(filePath, content, encoding) {
    if (encoding && typeof content === "string") fs.writeFileSync(filePath, content, { encoding });
    else fs.writeFileSync(filePath, content);
  }
};

// node_modules/@composio/core/dist/fileUtils.node-MOEGtpnI.mjs
import crypto2 from "node:crypto";
var getExtensionFromMimeType = /* @__PURE__ */ __name((mimeType) => {
  const mimeToExt = {
    "text/plain": "txt",
    "text/html": "html",
    "text/css": "css",
    "text/javascript": "js",
    "application/json": "json",
    "application/xml": "xml",
    "application/pdf": "pdf",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
    "application/gzip": "gz",
    "application/x-tar": "tar",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "video/mp4": "mp4",
    "video/mpeg": "mpeg",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/webm": "webm"
  };
  const cleanMimeType = mimeType.split(";")[0].toLowerCase().trim();
  if (mimeToExt[cleanMimeType]) return mimeToExt[cleanMimeType];
  const parts = cleanMimeType.split("/");
  if (parts.length === 2) {
    const cleanSubtype = parts[1].toLowerCase();
    if (cleanSubtype.includes("+")) {
      const plusParts = cleanSubtype.split("+");
      const prefix = plusParts[0];
      const suffix = plusParts[plusParts.length - 1];
      if ([
        "svg",
        "atom",
        "rss"
      ].includes(prefix)) return prefix;
      if ([
        "json",
        "xml",
        "yaml",
        "zip",
        "gzip"
      ].includes(suffix)) return suffix;
      return suffix;
    }
    return cleanSubtype || "txt";
  }
  return "txt";
}, "getExtensionFromMimeType");
var generateTimestampedFilename = /* @__PURE__ */ __name((extension, prefix) => {
  return `${prefix || "file_ts"}${Date.now()}${getRandomShortId()}.${extension}`;
}, "generateTimestampedFilename");
var readFileContent = /* @__PURE__ */ __name(async (filePath) => {
  try {
    if (!platform.supportsFileSystem) throw new Error("File system operations are not supported in this runtime environment");
    const content = platform.readFileSync(filePath);
    return {
      fileName: generateTimestampedFilename(filePath.split(".").pop() || "txt"),
      content: content instanceof Uint8Array ? uint8ArrayToBase64(content) : uint8ArrayToBase64(new TextEncoder().encode(content)),
      mimeType: "application/octet-stream"
    };
  } catch (error) {
    throw new Error(`Error reading file at ${filePath}: ${error}`);
  }
}, "readFileContent");
var readFileContentFromURL = /* @__PURE__ */ __name(async (path4) => {
  const response = await fetch(path4);
  if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  const content = new Uint8Array(arrayBuffer);
  const mimeType = response.headers.get("content-type") || "application/octet-stream";
  const pathname = new URL(path4).pathname;
  let fileName = platform.basename(pathname);
  if (!fileName || fileName === "/") fileName = generateTimestampedFilename(getExtensionFromMimeType(mimeType));
  else if (!fileName.includes(".")) fileName = generateTimestampedFilename(getExtensionFromMimeType(mimeType));
  return {
    content: uint8ArrayToBase64(content),
    mimeType,
    fileName
  };
}, "readFileContentFromURL");
var uploadFileToS3 = /* @__PURE__ */ __name(async (fileName, content, toolSlug, toolkitSlug, mimeType, client) => {
  const contentBytes = base64ToUint8Array(content);
  const { key, new_presigned_url: signedURL } = await client.files.createPresignedURL({
    filename: fileName,
    mimetype: mimeType,
    md5: crypto2.createHash("md5").update(contentBytes).digest("hex"),
    tool_slug: toolSlug,
    toolkit_slug: toolkitSlug
  });
  logger_default.debug(`Uploading ${key} file to S3: ${key}`);
  const uploadBuffer = new Uint8Array(contentBytes.byteLength);
  uploadBuffer.set(contentBytes);
  const uploadResponse = await fetch(signedURL, {
    method: "PUT",
    body: uploadBuffer,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": contentBytes.length.toString()
    }
  });
  if (!uploadResponse.ok) throw new Error(`Failed to upload file to S3: ${uploadResponse.statusText}`);
  return key;
}, "uploadFileToS3");
var readFile = /* @__PURE__ */ __name(async (file) => {
  if (file instanceof File) {
    const content = await file.arrayBuffer();
    return {
      fileName: file.name,
      content: uint8ArrayToBase64(new Uint8Array(content)),
      mimeType: file.type
    };
  } else if (typeof file === "string") if (file.startsWith("http")) return await readFileContentFromURL(file);
  else return await readFileContent(file);
  throw new Error("Invalid file type");
}, "readFile");
var getFileDataAfterUploadingToS3 = /* @__PURE__ */ __name(async (file, { toolSlug, toolkitSlug, client }) => {
  if (!file) throw new Error("Either path or blob must be provided");
  const fileData = await readFile(file);
  logger_default.debug(`Uploading file to S3...`);
  const s3key = await uploadFileToS3(platform.basename(fileData.fileName), fileData.content, toolSlug, toolkitSlug, fileData.mimeType, client);
  logger_default.debug(`Done! File uploaded to S3: ${s3key}`, JSON.stringify(fileData, null, 2));
  return {
    name: fileData.fileName,
    mimetype: fileData.mimeType,
    s3key
  };
}, "getFileDataAfterUploadingToS3");
var downloadFileFromS3 = /* @__PURE__ */ __name(async ({ toolSlug, s3Url, mimeType }) => {
  const response = await fetch(s3Url);
  if (!response.ok) throw new Error(`Failed to download file: ${response.statusText}`);
  const data = await response.arrayBuffer();
  const fileName = generateTimestampedFilename(getExtensionFromMimeType(mimeType), `${toolSlug}_`);
  return {
    name: fileName,
    mimeType,
    s3Url,
    filePath: saveFile(fileName, new Uint8Array(data), true)
  };
}, "downloadFileFromS3");
var getComposioDir = /* @__PURE__ */ __name((createDirIfNotExists = false) => {
  try {
    const homeDir = platform.homedir();
    if (!homeDir) return null;
    const composioDir = platform.joinPath(homeDir, COMPOSIO_DIR);
    if (createDirIfNotExists && platform.supportsFileSystem && !platform.existsSync(composioDir)) platform.mkdirSync(composioDir);
    return composioDir;
  } catch (_error) {
    return null;
  }
}, "getComposioDir");
var getComposioTempFilesDir = /* @__PURE__ */ __name((createDirIfNotExists = false) => {
  try {
    const homeDir = platform.homedir();
    if (!homeDir) return null;
    const composioFilesDir = platform.joinPath(homeDir, COMPOSIO_DIR, TEMP_FILES_DIRECTORY_NAME);
    if (createDirIfNotExists && platform.supportsFileSystem && !platform.existsSync(composioFilesDir)) platform.mkdirSync(composioFilesDir);
    return composioFilesDir;
  } catch (_error) {
    return null;
  }
}, "getComposioTempFilesDir");
var saveFile = /* @__PURE__ */ __name((file, content, isTempFile = false) => {
  try {
    if (!platform.supportsFileSystem) {
      logger_default.debug("File system operations are not supported in this runtime environment");
      return null;
    }
    const composioFilesDir = isTempFile ? getComposioTempFilesDir(true) : getComposioDir(true);
    if (!composioFilesDir) return null;
    const filePath = platform.joinPath(composioFilesDir, platform.basename(file));
    logger_default.info(`Saving file to: ${filePath}`);
    if (content instanceof Uint8Array) platform.writeFileSync(filePath, content);
    else platform.writeFileSync(filePath, content, "utf8");
    return filePath;
  } catch (_error) {
    logger_default.debug(`Error saving file: ${_error}`);
    return null;
  }
}, "saveFile");

// node_modules/@composio/core/dist/FileToolModifier.utils.neutral-BN_L8usp.mjs
init_esm();
function isPlainObject(val) {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}
__name(isPlainObject, "isPlainObject");
var transformSchema = /* @__PURE__ */ __name((property) => {
  if (property.file_uploadable) return {
    title: property.title,
    description: property.description,
    format: "path",
    type: "string",
    file_uploadable: true
  };
  const newProperty = { ...property };
  if (property.type === "object" && property.properties) newProperty.properties = transformProperties(property.properties);
  if (property.anyOf) newProperty.anyOf = property.anyOf.map(transformSchema);
  if (property.oneOf) newProperty.oneOf = property.oneOf.map(transformSchema);
  if (property.allOf) newProperty.allOf = property.allOf.map(transformSchema);
  if (property.items) if (Array.isArray(property.items)) newProperty.items = property.items.map(transformSchema);
  else newProperty.items = transformSchema(property.items);
  return newProperty;
}, "transformSchema");
var transformProperties = /* @__PURE__ */ __name((properties) => {
  const newProperties = {};
  for (const [key, property] of Object.entries(properties)) newProperties[key] = transformSchema(property);
  return newProperties;
}, "transformProperties");
var schemaHasFileProperty = /* @__PURE__ */ __name((schema, property) => {
  if (!schema) return false;
  if (schema[property]) return true;
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) if (schemaHasFileProperty(prop, property)) return true;
  }
  if (schema.anyOf) {
    for (const variant of schema.anyOf) if (schemaHasFileProperty(variant, property)) return true;
  }
  if (schema.oneOf) {
    for (const variant of schema.oneOf) if (schemaHasFileProperty(variant, property)) return true;
  }
  if (schema.allOf) {
    for (const variant of schema.allOf) if (schemaHasFileProperty(variant, property)) return true;
  }
  if (schema.items) {
    if (Array.isArray(schema.items)) {
      for (const item of schema.items) if (schemaHasFileProperty(item, property)) return true;
    } else if (schemaHasFileProperty(schema.items, property)) return true;
  }
  return false;
}, "schemaHasFileProperty");
var schemaHasFileUploadable = /* @__PURE__ */ __name((schema) => {
  return schemaHasFileProperty(schema, "file_uploadable");
}, "schemaHasFileUploadable");
var schemaHasFileDownloadable = /* @__PURE__ */ __name((schema) => {
  return schemaHasFileProperty(schema, "file_downloadable");
}, "schemaHasFileDownloadable");

// node_modules/@composio/core/dist/utils/modifiers/FileToolModifier.node.mjs
var FileModifierErrorCodes = { FILE_UPLOAD_FAILED: "FILE_UPLOAD_FAILED" };
var ComposioFileUploadError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioFileUploadError");
  }
  constructor(message = "Failed to upload file", options = {}) {
    super(message, {
      ...options,
      code: FileModifierErrorCodes.FILE_UPLOAD_FAILED,
      possibleFixes: options.possibleFixes || ["Check if the file exists in the location provided"]
    });
    this.name = "ComposioFileUploadError";
  }
};
var hydrateFiles = /* @__PURE__ */ __name(async (value, schema, ctx) => {
  if (schema?.file_uploadable) {
    if (typeof value !== "string" && !(value instanceof File)) return value;
    logger_default.debug(`Uploading file "${value}"`);
    return getFileDataAfterUploadingToS3(value, {
      toolSlug: ctx.toolSlug,
      toolkitSlug: ctx.toolkitSlug,
      client: ctx.client
    });
  }
  const schemaVariants = [
    ...schema?.anyOf ?? [],
    ...schema?.oneOf ?? [],
    ...schema?.allOf ?? []
  ];
  if (schemaVariants.length > 0) {
    const uploadableVariants = schemaVariants.filter(schemaHasFileUploadable);
    if (uploadableVariants.length > 0) {
      let result = value;
      for (const variant of uploadableVariants) result = await hydrateFiles(result, variant, ctx);
      return result;
    }
  }
  if (schema?.type === "object" && schema.properties && isPlainObject(value)) {
    const transformed = {};
    for (const [k, v] of Object.entries(value)) transformed[k] = await hydrateFiles(v, schema.properties[k], ctx);
    return transformed;
  }
  if (schema?.type === "array" && schema.items && Array.isArray(value)) {
    const itemSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;
    return Promise.all(value.map((item) => hydrateFiles(item, itemSchema, ctx)));
  }
  return value;
}, "hydrateFiles");
var downloadS3File = /* @__PURE__ */ __name(async (value, ctx) => {
  const { s3url, mimetype } = value;
  try {
    logger_default.debug(`Downloading from S3: ${s3url}`);
    const dl = await downloadFileFromS3({
      toolSlug: ctx.toolSlug,
      s3Url: s3url,
      mimeType: mimetype ?? "application/octet-stream"
    });
    logger_default.debug(`Downloaded → ${dl.filePath}`);
    return {
      uri: dl.filePath,
      file_downloaded: dl.filePath ? true : false,
      s3url,
      mimeType: dl.mimeType
    };
  } catch (err) {
    logger_default.error(`Download failed: ${s3url}`, { cause: err });
    return {
      uri: "",
      file_downloaded: false,
      s3url,
      mimeType: mimetype ?? "application/octet-stream"
    };
  }
}, "downloadS3File");
var hydrateDownloads = /* @__PURE__ */ __name(async (value, schema, ctx) => {
  if (isPlainObject(value) && typeof value.s3url === "string") return downloadS3File(value, ctx);
  if (schema?.file_downloadable && isPlainObject(value) && typeof value.s3url === "string") return downloadS3File(value, ctx);
  const schemaVariants = [
    ...schema?.anyOf ?? [],
    ...schema?.oneOf ?? [],
    ...schema?.allOf ?? []
  ];
  if (schemaVariants.length > 0) {
    const downloadableVariants = schemaVariants.filter(schemaHasFileDownloadable);
    let result = value;
    for (const variant of downloadableVariants) result = await hydrateDownloads(result, variant, ctx);
    if (downloadableVariants.length === 0) return hydrateDownloads(value, void 0, ctx);
    return result;
  }
  if (isPlainObject(value)) {
    const pairs = await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await hydrateDownloads(v, schema?.properties?.[k], ctx)]));
    return Object.fromEntries(pairs);
  }
  if (Array.isArray(value)) {
    const itemSchema = schema?.items ? Array.isArray(schema.items) ? schema.items[0] : schema.items : void 0;
    return Promise.all(value.map((item) => hydrateDownloads(item, itemSchema, ctx)));
  }
  return value;
}, "hydrateDownloads");
var FileToolModifier = class {
  static {
    __name(this, "FileToolModifier");
  }
  client;
  constructor(client) {
    this.client = client;
  }
  async modifyToolSchema(toolSlug, toolkitSlug, schema) {
    if (!schema.inputParameters?.properties) return schema;
    const properties = transformProperties(schema.inputParameters.properties);
    return {
      ...schema,
      inputParameters: {
        ...schema.inputParameters,
        properties
      }
    };
  }
  async fileUploadModifier(tool, options) {
    const { params, toolSlug, toolkitSlug = "unknown" } = options;
    const { arguments: args } = params;
    if (!args || typeof args !== "object") return params;
    try {
      const newArgs = await hydrateFiles(args, tool.inputParameters, {
        toolSlug,
        toolkitSlug,
        client: this.client
      });
      return {
        ...params,
        arguments: newArgs
      };
    } catch (error) {
      throw new ComposioFileUploadError("Failed to upload file", { cause: error });
    }
  }
  async fileDownloadModifier(tool, options) {
    const { result, toolSlug } = options;
    const dataWithDownloads = await hydrateDownloads(result.data, tool.outputParameters, { toolSlug });
    return {
      ...result,
      data: dataWithDownloads
    };
  }
};

// node_modules/zod-to-json-schema/dist/esm/index.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/Options.js
init_esm();
var ignoreOverride = Symbol("Let zodToJsonSchema decide on which parser to use");
var defaultOptions = {
  name: void 0,
  $refStrategy: "root",
  basePath: ["#"],
  effectStrategy: "input",
  pipeStrategy: "all",
  dateStrategy: "format:date-time",
  mapStrategy: "entries",
  removeAdditionalStrategy: "passthrough",
  allowedAdditionalProperties: true,
  rejectedAdditionalProperties: false,
  definitionPath: "definitions",
  target: "jsonSchema7",
  strictUnions: false,
  definitions: {},
  errorMessages: false,
  markdownDescription: false,
  patternStrategy: "escape",
  applyRegexFlags: false,
  emailStrategy: "format:email",
  base64Strategy: "contentEncoding:base64",
  nameStrategy: "ref",
  openAiAnyTypeName: "OpenAiAnyType"
};
var getDefaultOptions = /* @__PURE__ */ __name((options) => typeof options === "string" ? {
  ...defaultOptions,
  name: options
} : {
  ...defaultOptions,
  ...options
}, "getDefaultOptions");

// node_modules/zod-to-json-schema/dist/esm/Refs.js
init_esm();
var getRefs = /* @__PURE__ */ __name((options) => {
  const _options = getDefaultOptions(options);
  const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
  return {
    ..._options,
    flags: { hasReferencedOpenAiAnyType: false },
    currentPath,
    propertyPath: void 0,
    seen: new Map(Object.entries(_options.definitions).map(([name, def]) => [
      def._def,
      {
        def: def._def,
        path: [..._options.basePath, _options.definitionPath, name],
        // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
        jsonSchema: void 0
      }
    ]))
  };
}, "getRefs");

// node_modules/zod-to-json-schema/dist/esm/errorMessages.js
init_esm();
function addErrorMessage(res, key, errorMessage, refs) {
  if (!refs?.errorMessages)
    return;
  if (errorMessage) {
    res.errorMessage = {
      ...res.errorMessage,
      [key]: errorMessage
    };
  }
}
__name(addErrorMessage, "addErrorMessage");
function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
  res[key] = value;
  addErrorMessage(res, key, errorMessage, refs);
}
__name(setResponseValueAndErrors, "setResponseValueAndErrors");

// node_modules/zod-to-json-schema/dist/esm/getRelativePath.js
init_esm();
var getRelativePath = /* @__PURE__ */ __name((pathA, pathB) => {
  let i = 0;
  for (; i < pathA.length && i < pathB.length; i++) {
    if (pathA[i] !== pathB[i])
      break;
  }
  return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
}, "getRelativePath");

// node_modules/zod-to-json-schema/dist/esm/parseDef.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/selectParser.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/parsers/any.js
init_esm();
function parseAnyDef(refs) {
  if (refs.target !== "openAi") {
    return {};
  }
  const anyDefinitionPath = [
    ...refs.basePath,
    refs.definitionPath,
    refs.openAiAnyTypeName
  ];
  refs.flags.hasReferencedOpenAiAnyType = true;
  return {
    $ref: refs.$refStrategy === "relative" ? getRelativePath(anyDefinitionPath, refs.currentPath) : anyDefinitionPath.join("/")
  };
}
__name(parseAnyDef, "parseAnyDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/array.js
init_esm();
function parseArrayDef(def, refs) {
  const res = {
    type: "array"
  };
  if (def.type?._def && def.type?._def?.typeName !== ZodFirstPartyTypeKind.ZodAny) {
    res.items = parseDef(def.type._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items"]
    });
  }
  if (def.minLength) {
    setResponseValueAndErrors(res, "minItems", def.minLength.value, def.minLength.message, refs);
  }
  if (def.maxLength) {
    setResponseValueAndErrors(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
  }
  if (def.exactLength) {
    setResponseValueAndErrors(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
    setResponseValueAndErrors(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
  }
  return res;
}
__name(parseArrayDef, "parseArrayDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js
init_esm();
function parseBigintDef(def, refs) {
  const res = {
    type: "integer",
    format: "int64"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}
__name(parseBigintDef, "parseBigintDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js
init_esm();
function parseBooleanDef() {
  return {
    type: "boolean"
  };
}
__name(parseBooleanDef, "parseBooleanDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/branded.js
init_esm();
function parseBrandedDef(_def, refs) {
  return parseDef(_def.type._def, refs);
}
__name(parseBrandedDef, "parseBrandedDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/catch.js
init_esm();
var parseCatchDef = /* @__PURE__ */ __name((def, refs) => {
  return parseDef(def.innerType._def, refs);
}, "parseCatchDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/date.js
init_esm();
function parseDateDef(def, refs, overrideDateStrategy) {
  const strategy = overrideDateStrategy ?? refs.dateStrategy;
  if (Array.isArray(strategy)) {
    return {
      anyOf: strategy.map((item, i) => parseDateDef(def, refs, item))
    };
  }
  switch (strategy) {
    case "string":
    case "format:date-time":
      return {
        type: "string",
        format: "date-time"
      };
    case "format:date":
      return {
        type: "string",
        format: "date"
      };
    case "integer":
      return integerDateParser(def, refs);
  }
}
__name(parseDateDef, "parseDateDef");
var integerDateParser = /* @__PURE__ */ __name((def, refs) => {
  const res = {
    type: "integer",
    format: "unix-time"
  };
  if (refs.target === "openApi3") {
    return res;
  }
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        setResponseValueAndErrors(
          res,
          "minimum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
      case "max":
        setResponseValueAndErrors(
          res,
          "maximum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
    }
  }
  return res;
}, "integerDateParser");

// node_modules/zod-to-json-schema/dist/esm/parsers/default.js
init_esm();
function parseDefaultDef(_def, refs) {
  return {
    ...parseDef(_def.innerType._def, refs),
    default: _def.defaultValue()
  };
}
__name(parseDefaultDef, "parseDefaultDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/effects.js
init_esm();
function parseEffectsDef(_def, refs) {
  return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs) : parseAnyDef(refs);
}
__name(parseEffectsDef, "parseEffectsDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/enum.js
init_esm();
function parseEnumDef(def) {
  return {
    type: "string",
    enum: Array.from(def.values)
  };
}
__name(parseEnumDef, "parseEnumDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js
init_esm();
var isJsonSchema7AllOfType = /* @__PURE__ */ __name((type) => {
  if ("type" in type && type.type === "string")
    return false;
  return "allOf" in type;
}, "isJsonSchema7AllOfType");
function parseIntersectionDef(def, refs) {
  const allOf = [
    parseDef(def.left._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "0"]
    }),
    parseDef(def.right._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "1"]
    })
  ].filter((x) => !!x);
  let unevaluatedProperties = refs.target === "jsonSchema2019-09" ? { unevaluatedProperties: false } : void 0;
  const mergedAllOf = [];
  allOf.forEach((schema) => {
    if (isJsonSchema7AllOfType(schema)) {
      mergedAllOf.push(...schema.allOf);
      if (schema.unevaluatedProperties === void 0) {
        unevaluatedProperties = void 0;
      }
    } else {
      let nestedSchema = schema;
      if ("additionalProperties" in schema && schema.additionalProperties === false) {
        const { additionalProperties, ...rest } = schema;
        nestedSchema = rest;
      } else {
        unevaluatedProperties = void 0;
      }
      mergedAllOf.push(nestedSchema);
    }
  });
  return mergedAllOf.length ? {
    allOf: mergedAllOf,
    ...unevaluatedProperties
  } : void 0;
}
__name(parseIntersectionDef, "parseIntersectionDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/literal.js
init_esm();
function parseLiteralDef(def, refs) {
  const parsedType = typeof def.value;
  if (parsedType !== "bigint" && parsedType !== "number" && parsedType !== "boolean" && parsedType !== "string") {
    return {
      type: Array.isArray(def.value) ? "array" : "object"
    };
  }
  if (refs.target === "openApi3") {
    return {
      type: parsedType === "bigint" ? "integer" : parsedType,
      enum: [def.value]
    };
  }
  return {
    type: parsedType === "bigint" ? "integer" : parsedType,
    const: def.value
  };
}
__name(parseLiteralDef, "parseLiteralDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/map.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/parsers/record.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/parsers/string.js
init_esm();
var emojiRegex = void 0;
var zodPatterns = {
  /**
   * `c` was changed to `[cC]` to replicate /i flag
   */
  cuid: /^[cC][^\s-]{8,}$/,
  cuid2: /^[0-9a-z]+$/,
  ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
  /**
   * `a-z` was added to replicate /i flag
   */
  email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
  /**
   * Constructed a valid Unicode RegExp
   *
   * Lazily instantiate since this type of regex isn't supported
   * in all envs (e.g. React Native).
   *
   * See:
   * https://github.com/colinhacks/zod/issues/2433
   * Fix in Zod:
   * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
   */
  emoji: /* @__PURE__ */ __name(() => {
    if (emojiRegex === void 0) {
      emojiRegex = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
    }
    return emojiRegex;
  }, "emoji"),
  /**
   * Unused
   */
  uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
  /**
   * Unused
   */
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  ipv4Cidr: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  /**
   * Unused
   */
  ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
  ipv6Cidr: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
  base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  nanoid: /^[a-zA-Z0-9_-]{21}$/,
  jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
};
function parseStringDef(def, refs) {
  const res = {
    type: "string"
  };
  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          break;
        case "max":
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "email":
          switch (refs.emailStrategy) {
            case "format:email":
              addFormat(res, "email", check.message, refs);
              break;
            case "format:idn-email":
              addFormat(res, "idn-email", check.message, refs);
              break;
            case "pattern:zod":
              addPattern(res, zodPatterns.email, check.message, refs);
              break;
          }
          break;
        case "url":
          addFormat(res, "uri", check.message, refs);
          break;
        case "uuid":
          addFormat(res, "uuid", check.message, refs);
          break;
        case "regex":
          addPattern(res, check.regex, check.message, refs);
          break;
        case "cuid":
          addPattern(res, zodPatterns.cuid, check.message, refs);
          break;
        case "cuid2":
          addPattern(res, zodPatterns.cuid2, check.message, refs);
          break;
        case "startsWith":
          addPattern(res, RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`), check.message, refs);
          break;
        case "endsWith":
          addPattern(res, RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`), check.message, refs);
          break;
        case "datetime":
          addFormat(res, "date-time", check.message, refs);
          break;
        case "date":
          addFormat(res, "date", check.message, refs);
          break;
        case "time":
          addFormat(res, "time", check.message, refs);
          break;
        case "duration":
          addFormat(res, "duration", check.message, refs);
          break;
        case "length":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "includes": {
          addPattern(res, RegExp(escapeLiteralCheckValue(check.value, refs)), check.message, refs);
          break;
        }
        case "ip": {
          if (check.version !== "v6") {
            addFormat(res, "ipv4", check.message, refs);
          }
          if (check.version !== "v4") {
            addFormat(res, "ipv6", check.message, refs);
          }
          break;
        }
        case "base64url":
          addPattern(res, zodPatterns.base64url, check.message, refs);
          break;
        case "jwt":
          addPattern(res, zodPatterns.jwt, check.message, refs);
          break;
        case "cidr": {
          if (check.version !== "v6") {
            addPattern(res, zodPatterns.ipv4Cidr, check.message, refs);
          }
          if (check.version !== "v4") {
            addPattern(res, zodPatterns.ipv6Cidr, check.message, refs);
          }
          break;
        }
        case "emoji":
          addPattern(res, zodPatterns.emoji(), check.message, refs);
          break;
        case "ulid": {
          addPattern(res, zodPatterns.ulid, check.message, refs);
          break;
        }
        case "base64": {
          switch (refs.base64Strategy) {
            case "format:binary": {
              addFormat(res, "binary", check.message, refs);
              break;
            }
            case "contentEncoding:base64": {
              setResponseValueAndErrors(res, "contentEncoding", "base64", check.message, refs);
              break;
            }
            case "pattern:zod": {
              addPattern(res, zodPatterns.base64, check.message, refs);
              break;
            }
          }
          break;
        }
        case "nanoid": {
          addPattern(res, zodPatterns.nanoid, check.message, refs);
        }
        case "toLowerCase":
        case "toUpperCase":
        case "trim":
          break;
        default:
          /* @__PURE__ */ ((_) => {
          })(check);
      }
    }
  }
  return res;
}
__name(parseStringDef, "parseStringDef");
function escapeLiteralCheckValue(literal, refs) {
  return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric(literal) : literal;
}
__name(escapeLiteralCheckValue, "escapeLiteralCheckValue");
var ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
function escapeNonAlphaNumeric(source) {
  let result = "";
  for (let i = 0; i < source.length; i++) {
    if (!ALPHA_NUMERIC.has(source[i])) {
      result += "\\";
    }
    result += source[i];
  }
  return result;
}
__name(escapeNonAlphaNumeric, "escapeNonAlphaNumeric");
function addFormat(schema, value, message, refs) {
  if (schema.format || schema.anyOf?.some((x) => x.format)) {
    if (!schema.anyOf) {
      schema.anyOf = [];
    }
    if (schema.format) {
      schema.anyOf.push({
        format: schema.format,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { format: schema.errorMessage.format }
        }
      });
      delete schema.format;
      if (schema.errorMessage) {
        delete schema.errorMessage.format;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.anyOf.push({
      format: value,
      ...message && refs.errorMessages && { errorMessage: { format: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "format", value, message, refs);
  }
}
__name(addFormat, "addFormat");
function addPattern(schema, regex, message, refs) {
  if (schema.pattern || schema.allOf?.some((x) => x.pattern)) {
    if (!schema.allOf) {
      schema.allOf = [];
    }
    if (schema.pattern) {
      schema.allOf.push({
        pattern: schema.pattern,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { pattern: schema.errorMessage.pattern }
        }
      });
      delete schema.pattern;
      if (schema.errorMessage) {
        delete schema.errorMessage.pattern;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.allOf.push({
      pattern: stringifyRegExpWithFlags(regex, refs),
      ...message && refs.errorMessages && { errorMessage: { pattern: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "pattern", stringifyRegExpWithFlags(regex, refs), message, refs);
  }
}
__name(addPattern, "addPattern");
function stringifyRegExpWithFlags(regex, refs) {
  if (!refs.applyRegexFlags || !regex.flags) {
    return regex.source;
  }
  const flags = {
    i: regex.flags.includes("i"),
    m: regex.flags.includes("m"),
    s: regex.flags.includes("s")
    // `.` matches newlines
  };
  const source = flags.i ? regex.source.toLowerCase() : regex.source;
  let pattern = "";
  let isEscaped = false;
  let inCharGroup = false;
  let inCharRange = false;
  for (let i = 0; i < source.length; i++) {
    if (isEscaped) {
      pattern += source[i];
      isEscaped = false;
      continue;
    }
    if (flags.i) {
      if (inCharGroup) {
        if (source[i].match(/[a-z]/)) {
          if (inCharRange) {
            pattern += source[i];
            pattern += `${source[i - 2]}-${source[i]}`.toUpperCase();
            inCharRange = false;
          } else if (source[i + 1] === "-" && source[i + 2]?.match(/[a-z]/)) {
            pattern += source[i];
            inCharRange = true;
          } else {
            pattern += `${source[i]}${source[i].toUpperCase()}`;
          }
          continue;
        }
      } else if (source[i].match(/[a-z]/)) {
        pattern += `[${source[i]}${source[i].toUpperCase()}]`;
        continue;
      }
    }
    if (flags.m) {
      if (source[i] === "^") {
        pattern += `(^|(?<=[\r
]))`;
        continue;
      } else if (source[i] === "$") {
        pattern += `($|(?=[\r
]))`;
        continue;
      }
    }
    if (flags.s && source[i] === ".") {
      pattern += inCharGroup ? `${source[i]}\r
` : `[${source[i]}\r
]`;
      continue;
    }
    pattern += source[i];
    if (source[i] === "\\") {
      isEscaped = true;
    } else if (inCharGroup && source[i] === "]") {
      inCharGroup = false;
    } else if (!inCharGroup && source[i] === "[") {
      inCharGroup = true;
    }
  }
  try {
    new RegExp(pattern);
  } catch {
    console.warn(`Could not convert regex pattern at ${refs.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`);
    return regex.source;
  }
  return pattern;
}
__name(stringifyRegExpWithFlags, "stringifyRegExpWithFlags");

// node_modules/zod-to-json-schema/dist/esm/parsers/record.js
function parseRecordDef(def, refs) {
  if (refs.target === "openAi") {
    console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
  }
  if (refs.target === "openApi3" && def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      type: "object",
      required: def.keyType._def.values,
      properties: def.keyType._def.values.reduce((acc, key) => ({
        ...acc,
        [key]: parseDef(def.valueType._def, {
          ...refs,
          currentPath: [...refs.currentPath, "properties", key]
        }) ?? parseAnyDef(refs)
      }), {}),
      additionalProperties: refs.rejectedAdditionalProperties
    };
  }
  const schema = {
    type: "object",
    additionalProperties: parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    }) ?? refs.allowedAdditionalProperties
  };
  if (refs.target === "openApi3") {
    return schema;
  }
  if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.checks?.length) {
    const { type, ...keyType } = parseStringDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      ...schema,
      propertyNames: {
        enum: def.keyType._def.values
      }
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodBranded && def.keyType._def.type._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.type._def.checks?.length) {
    const { type, ...keyType } = parseBrandedDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  }
  return schema;
}
__name(parseRecordDef, "parseRecordDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/map.js
function parseMapDef(def, refs) {
  if (refs.mapStrategy === "record") {
    return parseRecordDef(def, refs);
  }
  const keys = parseDef(def.keyType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "0"]
  }) || parseAnyDef(refs);
  const values = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "1"]
  }) || parseAnyDef(refs);
  return {
    type: "array",
    maxItems: 125,
    items: {
      type: "array",
      items: [keys, values],
      minItems: 2,
      maxItems: 2
    }
  };
}
__name(parseMapDef, "parseMapDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js
init_esm();
function parseNativeEnumDef(def) {
  const object = def.values;
  const actualKeys = Object.keys(def.values).filter((key) => {
    return typeof object[object[key]] !== "number";
  });
  const actualValues = actualKeys.map((key) => object[key]);
  const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)));
  return {
    type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
    enum: actualValues
  };
}
__name(parseNativeEnumDef, "parseNativeEnumDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/never.js
init_esm();
function parseNeverDef(refs) {
  return refs.target === "openAi" ? void 0 : {
    not: parseAnyDef({
      ...refs,
      currentPath: [...refs.currentPath, "not"]
    })
  };
}
__name(parseNeverDef, "parseNeverDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/null.js
init_esm();
function parseNullDef(refs) {
  return refs.target === "openApi3" ? {
    enum: ["null"],
    nullable: true
  } : {
    type: "null"
  };
}
__name(parseNullDef, "parseNullDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/parsers/union.js
init_esm();
var primitiveMappings = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBigInt: "integer",
  ZodBoolean: "boolean",
  ZodNull: "null"
};
function parseUnionDef(def, refs) {
  if (refs.target === "openApi3")
    return asAnyOf(def, refs);
  const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
  if (options.every((x) => x._def.typeName in primitiveMappings && (!x._def.checks || !x._def.checks.length))) {
    const types = options.reduce((types2, x) => {
      const type = primitiveMappings[x._def.typeName];
      return type && !types2.includes(type) ? [...types2, type] : types2;
    }, []);
    return {
      type: types.length > 1 ? types : types[0]
    };
  } else if (options.every((x) => x._def.typeName === "ZodLiteral" && !x.description)) {
    const types = options.reduce((acc, x) => {
      const type = typeof x._def.value;
      switch (type) {
        case "string":
        case "number":
        case "boolean":
          return [...acc, type];
        case "bigint":
          return [...acc, "integer"];
        case "object":
          if (x._def.value === null)
            return [...acc, "null"];
        case "symbol":
        case "undefined":
        case "function":
        default:
          return acc;
      }
    }, []);
    if (types.length === options.length) {
      const uniqueTypes = types.filter((x, i, a) => a.indexOf(x) === i);
      return {
        type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
        enum: options.reduce((acc, x) => {
          return acc.includes(x._def.value) ? acc : [...acc, x._def.value];
        }, [])
      };
    }
  } else if (options.every((x) => x._def.typeName === "ZodEnum")) {
    return {
      type: "string",
      enum: options.reduce((acc, x) => [
        ...acc,
        ...x._def.values.filter((x2) => !acc.includes(x2))
      ], [])
    };
  }
  return asAnyOf(def, refs);
}
__name(parseUnionDef, "parseUnionDef");
var asAnyOf = /* @__PURE__ */ __name((def, refs) => {
  const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map((x, i) => parseDef(x._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", `${i}`]
  })).filter((x) => !!x && (!refs.strictUnions || typeof x === "object" && Object.keys(x).length > 0));
  return anyOf.length ? { anyOf } : void 0;
}, "asAnyOf");

// node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js
function parseNullableDef(def, refs) {
  if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(def.innerType._def.typeName) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
    if (refs.target === "openApi3") {
      return {
        type: primitiveMappings[def.innerType._def.typeName],
        nullable: true
      };
    }
    return {
      type: [
        primitiveMappings[def.innerType._def.typeName],
        "null"
      ]
    };
  }
  if (refs.target === "openApi3") {
    const base2 = parseDef(def.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath]
    });
    if (base2 && "$ref" in base2)
      return { allOf: [base2], nullable: true };
    return base2 && { ...base2, nullable: true };
  }
  const base = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "0"]
  });
  return base && { anyOf: [base, { type: "null" }] };
}
__name(parseNullableDef, "parseNullableDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/number.js
init_esm();
function parseNumberDef(def, refs) {
  const res = {
    type: "number"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "int":
        res.type = "integer";
        addErrorMessage(res, "type", check.message, refs);
        break;
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}
__name(parseNumberDef, "parseNumberDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/object.js
init_esm();
function parseObjectDef(def, refs) {
  const forceOptionalIntoNullable = refs.target === "openAi";
  const result = {
    type: "object",
    properties: {}
  };
  const required = [];
  const shape = def.shape();
  for (const propName in shape) {
    let propDef = shape[propName];
    if (propDef === void 0 || propDef._def === void 0) {
      continue;
    }
    let propOptional = safeIsOptional(propDef);
    if (propOptional && forceOptionalIntoNullable) {
      if (propDef._def.typeName === "ZodOptional") {
        propDef = propDef._def.innerType;
      }
      if (!propDef.isNullable()) {
        propDef = propDef.nullable();
      }
      propOptional = false;
    }
    const parsedDef = parseDef(propDef._def, {
      ...refs,
      currentPath: [...refs.currentPath, "properties", propName],
      propertyPath: [...refs.currentPath, "properties", propName]
    });
    if (parsedDef === void 0) {
      continue;
    }
    result.properties[propName] = parsedDef;
    if (!propOptional) {
      required.push(propName);
    }
  }
  if (required.length) {
    result.required = required;
  }
  const additionalProperties = decideAdditionalProperties(def, refs);
  if (additionalProperties !== void 0) {
    result.additionalProperties = additionalProperties;
  }
  return result;
}
__name(parseObjectDef, "parseObjectDef");
function decideAdditionalProperties(def, refs) {
  if (def.catchall._def.typeName !== "ZodNever") {
    return parseDef(def.catchall._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    });
  }
  switch (def.unknownKeys) {
    case "passthrough":
      return refs.allowedAdditionalProperties;
    case "strict":
      return refs.rejectedAdditionalProperties;
    case "strip":
      return refs.removeAdditionalStrategy === "strict" ? refs.allowedAdditionalProperties : refs.rejectedAdditionalProperties;
  }
}
__name(decideAdditionalProperties, "decideAdditionalProperties");
function safeIsOptional(schema) {
  try {
    return schema.isOptional();
  } catch {
    return true;
  }
}
__name(safeIsOptional, "safeIsOptional");

// node_modules/zod-to-json-schema/dist/esm/parsers/optional.js
init_esm();
var parseOptionalDef = /* @__PURE__ */ __name((def, refs) => {
  if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
    return parseDef(def.innerType._def, refs);
  }
  const innerSchema = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "1"]
  });
  return innerSchema ? {
    anyOf: [
      {
        not: parseAnyDef(refs)
      },
      innerSchema
    ]
  } : parseAnyDef(refs);
}, "parseOptionalDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js
init_esm();
var parsePipelineDef = /* @__PURE__ */ __name((def, refs) => {
  if (refs.pipeStrategy === "input") {
    return parseDef(def.in._def, refs);
  } else if (refs.pipeStrategy === "output") {
    return parseDef(def.out._def, refs);
  }
  const a = parseDef(def.in._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", "0"]
  });
  const b = parseDef(def.out._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", a ? "1" : "0"]
  });
  return {
    allOf: [a, b].filter((x) => x !== void 0)
  };
}, "parsePipelineDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/promise.js
init_esm();
function parsePromiseDef(def, refs) {
  return parseDef(def.type._def, refs);
}
__name(parsePromiseDef, "parsePromiseDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/set.js
init_esm();
function parseSetDef(def, refs) {
  const items = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items"]
  });
  const schema = {
    type: "array",
    uniqueItems: true,
    items
  };
  if (def.minSize) {
    setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
  }
  if (def.maxSize) {
    setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
  }
  return schema;
}
__name(parseSetDef, "parseSetDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js
init_esm();
function parseTupleDef(def, refs) {
  if (def.rest) {
    return {
      type: "array",
      minItems: def.items.length,
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], []),
      additionalItems: parseDef(def.rest._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalItems"]
      })
    };
  } else {
    return {
      type: "array",
      minItems: def.items.length,
      maxItems: def.items.length,
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], [])
    };
  }
}
__name(parseTupleDef, "parseTupleDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js
init_esm();
function parseUndefinedDef(refs) {
  return {
    not: parseAnyDef(refs)
  };
}
__name(parseUndefinedDef, "parseUndefinedDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js
init_esm();
function parseUnknownDef(refs) {
  return parseAnyDef(refs);
}
__name(parseUnknownDef, "parseUnknownDef");

// node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js
init_esm();
var parseReadonlyDef = /* @__PURE__ */ __name((def, refs) => {
  return parseDef(def.innerType._def, refs);
}, "parseReadonlyDef");

// node_modules/zod-to-json-schema/dist/esm/selectParser.js
var selectParser = /* @__PURE__ */ __name((def, typeName, refs) => {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return parseStringDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNumber:
      return parseNumberDef(def, refs);
    case ZodFirstPartyTypeKind.ZodObject:
      return parseObjectDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBigInt:
      return parseBigintDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBoolean:
      return parseBooleanDef();
    case ZodFirstPartyTypeKind.ZodDate:
      return parseDateDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUndefined:
      return parseUndefinedDef(refs);
    case ZodFirstPartyTypeKind.ZodNull:
      return parseNullDef(refs);
    case ZodFirstPartyTypeKind.ZodArray:
      return parseArrayDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUnion:
    case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return parseUnionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodIntersection:
      return parseIntersectionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodTuple:
      return parseTupleDef(def, refs);
    case ZodFirstPartyTypeKind.ZodRecord:
      return parseRecordDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLiteral:
      return parseLiteralDef(def, refs);
    case ZodFirstPartyTypeKind.ZodEnum:
      return parseEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      return parseNativeEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNullable:
      return parseNullableDef(def, refs);
    case ZodFirstPartyTypeKind.ZodOptional:
      return parseOptionalDef(def, refs);
    case ZodFirstPartyTypeKind.ZodMap:
      return parseMapDef(def, refs);
    case ZodFirstPartyTypeKind.ZodSet:
      return parseSetDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLazy:
      return () => def.getter()._def;
    case ZodFirstPartyTypeKind.ZodPromise:
      return parsePromiseDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNaN:
    case ZodFirstPartyTypeKind.ZodNever:
      return parseNeverDef(refs);
    case ZodFirstPartyTypeKind.ZodEffects:
      return parseEffectsDef(def, refs);
    case ZodFirstPartyTypeKind.ZodAny:
      return parseAnyDef(refs);
    case ZodFirstPartyTypeKind.ZodUnknown:
      return parseUnknownDef(refs);
    case ZodFirstPartyTypeKind.ZodDefault:
      return parseDefaultDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBranded:
      return parseBrandedDef(def, refs);
    case ZodFirstPartyTypeKind.ZodReadonly:
      return parseReadonlyDef(def, refs);
    case ZodFirstPartyTypeKind.ZodCatch:
      return parseCatchDef(def, refs);
    case ZodFirstPartyTypeKind.ZodPipeline:
      return parsePipelineDef(def, refs);
    case ZodFirstPartyTypeKind.ZodFunction:
    case ZodFirstPartyTypeKind.ZodVoid:
    case ZodFirstPartyTypeKind.ZodSymbol:
      return void 0;
    default:
      return /* @__PURE__ */ ((_) => void 0)(typeName);
  }
}, "selectParser");

// node_modules/zod-to-json-schema/dist/esm/parseDef.js
function parseDef(def, refs, forceResolution = false) {
  const seenItem = refs.seen.get(def);
  if (refs.override) {
    const overrideResult = refs.override?.(def, refs, seenItem, forceResolution);
    if (overrideResult !== ignoreOverride) {
      return overrideResult;
    }
  }
  if (seenItem && !forceResolution) {
    const seenSchema = get$ref(seenItem, refs);
    if (seenSchema !== void 0) {
      return seenSchema;
    }
  }
  const newItem = { def, path: refs.currentPath, jsonSchema: void 0 };
  refs.seen.set(def, newItem);
  const jsonSchemaOrGetter = selectParser(def, def.typeName, refs);
  const jsonSchema = typeof jsonSchemaOrGetter === "function" ? parseDef(jsonSchemaOrGetter(), refs) : jsonSchemaOrGetter;
  if (jsonSchema) {
    addMeta(def, refs, jsonSchema);
  }
  if (refs.postProcess) {
    const postProcessResult = refs.postProcess(jsonSchema, def, refs);
    newItem.jsonSchema = jsonSchema;
    return postProcessResult;
  }
  newItem.jsonSchema = jsonSchema;
  return jsonSchema;
}
__name(parseDef, "parseDef");
var get$ref = /* @__PURE__ */ __name((item, refs) => {
  switch (refs.$refStrategy) {
    case "root":
      return { $ref: item.path.join("/") };
    case "relative":
      return { $ref: getRelativePath(refs.currentPath, item.path) };
    case "none":
    case "seen": {
      if (item.path.length < refs.currentPath.length && item.path.every((value, index) => refs.currentPath[index] === value)) {
        console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
        return parseAnyDef(refs);
      }
      return refs.$refStrategy === "seen" ? parseAnyDef(refs) : void 0;
    }
  }
}, "get$ref");
var addMeta = /* @__PURE__ */ __name((def, refs, jsonSchema) => {
  if (def.description) {
    jsonSchema.description = def.description;
    if (refs.markdownDescription) {
      jsonSchema.markdownDescription = def.description;
    }
  }
  return jsonSchema;
}, "addMeta");

// node_modules/zod-to-json-schema/dist/esm/parseTypes.js
init_esm();

// node_modules/zod-to-json-schema/dist/esm/zodToJsonSchema.js
init_esm();
var zodToJsonSchema = /* @__PURE__ */ __name((schema, options) => {
  const refs = getRefs(options);
  let definitions = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce((acc, [name2, schema2]) => ({
    ...acc,
    [name2]: parseDef(schema2._def, {
      ...refs,
      currentPath: [...refs.basePath, refs.definitionPath, name2]
    }, true) ?? parseAnyDef(refs)
  }), {}) : void 0;
  const name = typeof options === "string" ? options : options?.nameStrategy === "title" ? void 0 : options?.name;
  const main = parseDef(schema._def, name === void 0 ? refs : {
    ...refs,
    currentPath: [...refs.basePath, refs.definitionPath, name]
  }, false) ?? parseAnyDef(refs);
  const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
  if (title !== void 0) {
    main.title = title;
  }
  if (refs.flags.hasReferencedOpenAiAnyType) {
    if (!definitions) {
      definitions = {};
    }
    if (!definitions[refs.openAiAnyTypeName]) {
      definitions[refs.openAiAnyTypeName] = {
        // Skipping "object" as no properties can be defined and additionalProperties must be "false"
        type: ["string", "number", "integer", "boolean", "array", "null"],
        items: {
          $ref: refs.$refStrategy === "relative" ? "1" : [
            ...refs.basePath,
            refs.definitionPath,
            refs.openAiAnyTypeName
          ].join("/")
        }
      };
    }
  }
  const combined = name === void 0 ? definitions ? {
    ...main,
    [refs.definitionPath]: definitions
  } : main : {
    $ref: [
      ...refs.$refStrategy === "relative" ? [] : refs.basePath,
      refs.definitionPath,
      name
    ].join("/"),
    [refs.definitionPath]: {
      ...definitions,
      [name]: main
    }
  };
  if (refs.target === "jsonSchema7") {
    combined.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (refs.target === "jsonSchema2019-09" || refs.target === "openAi") {
    combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
  }
  if (refs.target === "openAi" && ("anyOf" in combined || "oneOf" in combined || "allOf" in combined || "type" in combined && Array.isArray(combined.type))) {
    console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");
  }
  return combined;
}, "zodToJsonSchema");

// node_modules/zod-to-json-schema/dist/esm/index.js
var esm_default = zodToJsonSchema;

// node_modules/@composio/core/dist/utils/config-defaults/ConfigDefaults.node.mjs
init_esm();
var CONFIG_DEFAULTS = {
  autoUploadDownloadFiles: true,
  allowTracking: true,
  toolkitVersions: "latest"
};

// node_modules/openai/index.mjs
init_esm();

// node_modules/openai/client.mjs
init_esm();

// node_modules/openai/internal/tslib.mjs
init_esm();
function __classPrivateFieldSet2(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
__name(__classPrivateFieldSet2, "__classPrivateFieldSet");
function __classPrivateFieldGet2(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
__name(__classPrivateFieldGet2, "__classPrivateFieldGet");

// node_modules/openai/internal/utils/uuid.mjs
init_esm();
var uuid42 = /* @__PURE__ */ __name(function() {
  const { crypto: crypto3 } = globalThis;
  if (crypto3?.randomUUID) {
    uuid42 = crypto3.randomUUID.bind(crypto3);
    return crypto3.randomUUID();
  }
  const u8 = new Uint8Array(1);
  const randomByte = crypto3 ? () => crypto3.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
}, "uuid4");

// node_modules/openai/internal/utils/values.mjs
init_esm();

// node_modules/openai/core/error.mjs
init_esm();

// node_modules/openai/internal/errors.mjs
init_esm();
function isAbortError2(err) {
  return typeof err === "object" && err !== null && // Spec-compliant fetch implementations
  ("name" in err && err.name === "AbortError" || // Expo fetch
  "message" in err && String(err.message).includes("FetchRequestCanceledException"));
}
__name(isAbortError2, "isAbortError");
var castToError2 = /* @__PURE__ */ __name((err) => {
  if (err instanceof Error)
    return err;
  if (typeof err === "object" && err !== null) {
    try {
      if (Object.prototype.toString.call(err) === "[object Error]") {
        const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
        if (err.stack)
          error.stack = err.stack;
        if (err.cause && !error.cause)
          error.cause = err.cause;
        if (err.name)
          error.name = err.name;
        return error;
      }
    } catch {
    }
    try {
      return new Error(JSON.stringify(err));
    } catch {
    }
  }
  return new Error(err);
}, "castToError");

// node_modules/openai/core/error.mjs
var OpenAIError = class extends Error {
  static {
    __name(this, "OpenAIError");
  }
};
var APIError2 = class _APIError extends OpenAIError {
  static {
    __name(this, "APIError");
  }
  constructor(status, error, message, headers) {
    super(`${_APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.requestID = headers?.get("x-request-id");
    this.error = error;
    const data = error;
    this.code = data?.["code"];
    this.param = data?.["param"];
    this.type = data?.["type"];
  }
  static makeMessage(status, error, message) {
    const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers) {
      return new APIConnectionError2({ message, cause: castToError2(errorResponse) });
    }
    const error = errorResponse?.["error"];
    if (status === 400) {
      return new BadRequestError2(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError2(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError2(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError2(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError2(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError2(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError2(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError2(status, error, message, headers);
    }
    return new _APIError(status, error, message, headers);
  }
};
var APIUserAbortError2 = class extends APIError2 {
  static {
    __name(this, "APIUserAbortError");
  }
  constructor({ message } = {}) {
    super(void 0, void 0, message || "Request was aborted.", void 0);
  }
};
var APIConnectionError2 = class extends APIError2 {
  static {
    __name(this, "APIConnectionError");
  }
  constructor({ message, cause }) {
    super(void 0, void 0, message || "Connection error.", void 0);
    if (cause)
      this.cause = cause;
  }
};
var APIConnectionTimeoutError2 = class extends APIConnectionError2 {
  static {
    __name(this, "APIConnectionTimeoutError");
  }
  constructor({ message } = {}) {
    super({ message: message ?? "Request timed out." });
  }
};
var BadRequestError2 = class extends APIError2 {
  static {
    __name(this, "BadRequestError");
  }
};
var AuthenticationError2 = class extends APIError2 {
  static {
    __name(this, "AuthenticationError");
  }
};
var PermissionDeniedError2 = class extends APIError2 {
  static {
    __name(this, "PermissionDeniedError");
  }
};
var NotFoundError2 = class extends APIError2 {
  static {
    __name(this, "NotFoundError");
  }
};
var ConflictError2 = class extends APIError2 {
  static {
    __name(this, "ConflictError");
  }
};
var UnprocessableEntityError2 = class extends APIError2 {
  static {
    __name(this, "UnprocessableEntityError");
  }
};
var RateLimitError2 = class extends APIError2 {
  static {
    __name(this, "RateLimitError");
  }
};
var InternalServerError2 = class extends APIError2 {
  static {
    __name(this, "InternalServerError");
  }
};
var LengthFinishReasonError = class extends OpenAIError {
  static {
    __name(this, "LengthFinishReasonError");
  }
  constructor() {
    super(`Could not parse response content as the length limit was reached`);
  }
};
var ContentFilterFinishReasonError = class extends OpenAIError {
  static {
    __name(this, "ContentFilterFinishReasonError");
  }
  constructor() {
    super(`Could not parse response content as the request was rejected by the content filter`);
  }
};
var InvalidWebhookSignatureError = class extends Error {
  static {
    __name(this, "InvalidWebhookSignatureError");
  }
  constructor(message) {
    super(message);
  }
};

// node_modules/openai/internal/utils/values.mjs
var startsWithSchemeRegexp2 = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL2 = /* @__PURE__ */ __name((url) => {
  return startsWithSchemeRegexp2.test(url);
}, "isAbsoluteURL");
var isArray2 = /* @__PURE__ */ __name((val) => (isArray2 = Array.isArray, isArray2(val)), "isArray");
var isReadonlyArray2 = isArray2;
function maybeObj(x) {
  if (typeof x !== "object") {
    return {};
  }
  return x ?? {};
}
__name(maybeObj, "maybeObj");
function isEmptyObj2(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}
__name(isEmptyObj2, "isEmptyObj");
function hasOwn2(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
__name(hasOwn2, "hasOwn");
function isObj(obj) {
  return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
__name(isObj, "isObj");
var validatePositiveInteger2 = /* @__PURE__ */ __name((name, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new OpenAIError(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new OpenAIError(`${name} must be a positive integer`);
  }
  return n;
}, "validatePositiveInteger");
var safeJSON2 = /* @__PURE__ */ __name((text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return void 0;
  }
}, "safeJSON");

// node_modules/openai/internal/utils/sleep.mjs
init_esm();
var sleep2 = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "sleep");

// node_modules/openai/internal/detect-platform.mjs
init_esm();

// node_modules/openai/version.mjs
init_esm();
var VERSION2 = "6.26.0";

// node_modules/openai/internal/detect-platform.mjs
var isRunningInBrowser = /* @__PURE__ */ __name(() => {
  return (
    // @ts-ignore
    typeof window !== "undefined" && // @ts-ignore
    typeof window.document !== "undefined" && // @ts-ignore
    typeof navigator !== "undefined"
  );
}, "isRunningInBrowser");
function getDetectedPlatform2() {
  if (typeof Deno !== "undefined" && Deno.build != null) {
    return "deno";
  }
  if (typeof EdgeRuntime !== "undefined") {
    return "edge";
  }
  if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") {
    return "node";
  }
  return "unknown";
}
__name(getDetectedPlatform2, "getDetectedPlatform");
var getPlatformProperties2 = /* @__PURE__ */ __name(() => {
  const detectedPlatform = getDetectedPlatform2();
  if (detectedPlatform === "deno") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION2,
      "X-Stainless-OS": normalizePlatform2(Deno.build.os),
      "X-Stainless-Arch": normalizeArch2(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
    };
  }
  if (typeof EdgeRuntime !== "undefined") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION2,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process.version
    };
  }
  if (detectedPlatform === "node") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION2,
      "X-Stainless-OS": normalizePlatform2(globalThis.process.platform ?? "unknown"),
      "X-Stainless-Arch": normalizeArch2(globalThis.process.arch ?? "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
    };
  }
  const browserInfo = getBrowserInfo2();
  if (browserInfo) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION2,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version
    };
  }
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION2,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
}, "getPlatformProperties");
function getBrowserInfo2() {
  if (typeof navigator === "undefined" || !navigator) {
    return null;
  }
  const browserPatterns = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;
      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }
  return null;
}
__name(getBrowserInfo2, "getBrowserInfo");
var normalizeArch2 = /* @__PURE__ */ __name((arch) => {
  if (arch === "x32")
    return "x32";
  if (arch === "x86_64" || arch === "x64")
    return "x64";
  if (arch === "arm")
    return "arm";
  if (arch === "aarch64" || arch === "arm64")
    return "arm64";
  if (arch)
    return `other:${arch}`;
  return "unknown";
}, "normalizeArch");
var normalizePlatform2 = /* @__PURE__ */ __name((platform2) => {
  platform2 = platform2.toLowerCase();
  if (platform2.includes("ios"))
    return "iOS";
  if (platform2 === "android")
    return "Android";
  if (platform2 === "darwin")
    return "MacOS";
  if (platform2 === "win32")
    return "Windows";
  if (platform2 === "freebsd")
    return "FreeBSD";
  if (platform2 === "openbsd")
    return "OpenBSD";
  if (platform2 === "linux")
    return "Linux";
  if (platform2)
    return `Other:${platform2}`;
  return "Unknown";
}, "normalizePlatform");
var _platformHeaders2;
var getPlatformHeaders2 = /* @__PURE__ */ __name(() => {
  return _platformHeaders2 ?? (_platformHeaders2 = getPlatformProperties2());
}, "getPlatformHeaders");

// node_modules/openai/internal/shims.mjs
init_esm();
function getDefaultFetch2() {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new OpenAI({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
__name(getDefaultFetch2, "getDefaultFetch");
function makeReadableStream2(...args) {
  const ReadableStream = globalThis.ReadableStream;
  if (typeof ReadableStream === "undefined") {
    throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  }
  return new ReadableStream(...args);
}
__name(makeReadableStream2, "makeReadableStream");
function ReadableStreamFrom2(iterable) {
  let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
  return makeReadableStream2({
    start() {
    },
    async pull(controller) {
      const { done, value } = await iter.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    async cancel() {
      await iter.return?.();
    }
  });
}
__name(ReadableStreamFrom2, "ReadableStreamFrom");
function ReadableStreamToAsyncIterable(stream) {
  if (stream[Symbol.asyncIterator])
    return stream;
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const result = await reader.read();
        if (result?.done)
          reader.releaseLock();
        return result;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      const cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value: void 0 };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
__name(ReadableStreamToAsyncIterable, "ReadableStreamToAsyncIterable");
async function CancelReadableStream2(stream) {
  if (stream === null || typeof stream !== "object")
    return;
  if (stream[Symbol.asyncIterator]) {
    await stream[Symbol.asyncIterator]().return?.();
    return;
  }
  const reader = stream.getReader();
  const cancelPromise = reader.cancel();
  reader.releaseLock();
  await cancelPromise;
}
__name(CancelReadableStream2, "CancelReadableStream");

// node_modules/openai/internal/request-options.mjs
init_esm();
var FallbackEncoder2 = /* @__PURE__ */ __name(({ headers, body }) => {
  return {
    bodyHeaders: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}, "FallbackEncoder");

// node_modules/openai/internal/utils/query.mjs
init_esm();

// node_modules/openai/internal/qs/stringify.mjs
init_esm();

// node_modules/openai/internal/qs/utils.mjs
init_esm();

// node_modules/openai/internal/qs/formats.mjs
init_esm();
var default_format2 = "RFC3986";
var default_formatter2 = /* @__PURE__ */ __name((v) => String(v), "default_formatter");
var formatters2 = {
  RFC1738: /* @__PURE__ */ __name((v) => String(v).replace(/%20/g, "+"), "RFC1738"),
  RFC3986: default_formatter2
};
var RFC17382 = "RFC1738";

// node_modules/openai/internal/qs/utils.mjs
var has2 = /* @__PURE__ */ __name((obj, key) => (has2 = Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty), has2(obj, key)), "has");
var hex_table2 = /* @__PURE__ */ (() => {
  const array = [];
  for (let i = 0; i < 256; ++i) {
    array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
  }
  return array;
})();
var limit2 = 1024;
var encode2 = /* @__PURE__ */ __name((str2, _defaultEncoder, charset, _kind, format) => {
  if (str2.length === 0) {
    return str2;
  }
  let string = str2;
  if (typeof str2 === "symbol") {
    string = Symbol.prototype.toString.call(str2);
  } else if (typeof str2 !== "string") {
    string = String(str2);
  }
  if (charset === "iso-8859-1") {
    return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
      return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
    });
  }
  let out = "";
  for (let j = 0; j < string.length; j += limit2) {
    const segment = string.length >= limit2 ? string.slice(j, j + limit2) : string;
    const arr = [];
    for (let i = 0; i < segment.length; ++i) {
      let c = segment.charCodeAt(i);
      if (c === 45 || // -
      c === 46 || // .
      c === 95 || // _
      c === 126 || // ~
      c >= 48 && c <= 57 || // 0-9
      c >= 65 && c <= 90 || // a-z
      c >= 97 && c <= 122 || // A-Z
      format === RFC17382 && (c === 40 || c === 41)) {
        arr[arr.length] = segment.charAt(i);
        continue;
      }
      if (c < 128) {
        arr[arr.length] = hex_table2[c];
        continue;
      }
      if (c < 2048) {
        arr[arr.length] = hex_table2[192 | c >> 6] + hex_table2[128 | c & 63];
        continue;
      }
      if (c < 55296 || c >= 57344) {
        arr[arr.length] = hex_table2[224 | c >> 12] + hex_table2[128 | c >> 6 & 63] + hex_table2[128 | c & 63];
        continue;
      }
      i += 1;
      c = 65536 + ((c & 1023) << 10 | segment.charCodeAt(i) & 1023);
      arr[arr.length] = hex_table2[240 | c >> 18] + hex_table2[128 | c >> 12 & 63] + hex_table2[128 | c >> 6 & 63] + hex_table2[128 | c & 63];
    }
    out += arr.join("");
  }
  return out;
}, "encode");
function is_buffer2(obj) {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
__name(is_buffer2, "is_buffer");
function maybe_map2(val, fn) {
  if (isArray2(val)) {
    const mapped = [];
    for (let i = 0; i < val.length; i += 1) {
      mapped.push(fn(val[i]));
    }
    return mapped;
  }
  return fn(val);
}
__name(maybe_map2, "maybe_map");

// node_modules/openai/internal/qs/stringify.mjs
var array_prefix_generators2 = {
  brackets(prefix) {
    return String(prefix) + "[]";
  },
  comma: "comma",
  indices(prefix, key) {
    return String(prefix) + "[" + key + "]";
  },
  repeat(prefix) {
    return String(prefix);
  }
};
var push_to_array2 = /* @__PURE__ */ __name(function(arr, value_or_array) {
  Array.prototype.push.apply(arr, isArray2(value_or_array) ? value_or_array : [value_or_array]);
}, "push_to_array");
var toISOString2;
var defaults2 = {
  addQueryPrefix: false,
  allowDots: false,
  allowEmptyArrays: false,
  arrayFormat: "indices",
  charset: "utf-8",
  charsetSentinel: false,
  delimiter: "&",
  encode: true,
  encodeDotInKeys: false,
  encoder: encode2,
  encodeValuesOnly: false,
  format: default_format2,
  formatter: default_formatter2,
  /** @deprecated */
  indices: false,
  serializeDate(date) {
    return (toISOString2 ?? (toISOString2 = Function.prototype.call.bind(Date.prototype.toISOString)))(date);
  },
  skipNulls: false,
  strictNullHandling: false
};
function is_non_nullish_primitive2(v) {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || typeof v === "symbol" || typeof v === "bigint";
}
__name(is_non_nullish_primitive2, "is_non_nullish_primitive");
var sentinel2 = {};
function inner_stringify2(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
  let obj = object;
  let tmp_sc = sideChannel;
  let step = 0;
  let find_flag = false;
  while ((tmp_sc = tmp_sc.get(sentinel2)) !== void 0 && !find_flag) {
    const pos = tmp_sc.get(object);
    step += 1;
    if (typeof pos !== "undefined") {
      if (pos === step) {
        throw new RangeError("Cyclic object value");
      } else {
        find_flag = true;
      }
    }
    if (typeof tmp_sc.get(sentinel2) === "undefined") {
      step = 0;
    }
  }
  if (typeof filter === "function") {
    obj = filter(prefix, obj);
  } else if (obj instanceof Date) {
    obj = serializeDate?.(obj);
  } else if (generateArrayPrefix === "comma" && isArray2(obj)) {
    obj = maybe_map2(obj, function(value) {
      if (value instanceof Date) {
        return serializeDate?.(value);
      }
      return value;
    });
  }
  if (obj === null) {
    if (strictNullHandling) {
      return encoder && !encodeValuesOnly ? (
        // @ts-expect-error
        encoder(prefix, defaults2.encoder, charset, "key", format)
      ) : prefix;
    }
    obj = "";
  }
  if (is_non_nullish_primitive2(obj) || is_buffer2(obj)) {
    if (encoder) {
      const key_value = encodeValuesOnly ? prefix : encoder(prefix, defaults2.encoder, charset, "key", format);
      return [
        formatter?.(key_value) + "=" + // @ts-expect-error
        formatter?.(encoder(obj, defaults2.encoder, charset, "value", format))
      ];
    }
    return [formatter?.(prefix) + "=" + formatter?.(String(obj))];
  }
  const values = [];
  if (typeof obj === "undefined") {
    return values;
  }
  let obj_keys;
  if (generateArrayPrefix === "comma" && isArray2(obj)) {
    if (encodeValuesOnly && encoder) {
      obj = maybe_map2(obj, encoder);
    }
    obj_keys = [{ value: obj.length > 0 ? obj.join(",") || null : void 0 }];
  } else if (isArray2(filter)) {
    obj_keys = filter;
  } else {
    const keys = Object.keys(obj);
    obj_keys = sort ? keys.sort(sort) : keys;
  }
  const encoded_prefix = encodeDotInKeys ? String(prefix).replace(/\./g, "%2E") : String(prefix);
  const adjusted_prefix = commaRoundTrip && isArray2(obj) && obj.length === 1 ? encoded_prefix + "[]" : encoded_prefix;
  if (allowEmptyArrays && isArray2(obj) && obj.length === 0) {
    return adjusted_prefix + "[]";
  }
  for (let j = 0; j < obj_keys.length; ++j) {
    const key = obj_keys[j];
    const value = (
      // @ts-ignore
      typeof key === "object" && typeof key.value !== "undefined" ? key.value : obj[key]
    );
    if (skipNulls && value === null) {
      continue;
    }
    const encoded_key = allowDots && encodeDotInKeys ? key.replace(/\./g, "%2E") : key;
    const key_prefix = isArray2(obj) ? typeof generateArrayPrefix === "function" ? generateArrayPrefix(adjusted_prefix, encoded_key) : adjusted_prefix : adjusted_prefix + (allowDots ? "." + encoded_key : "[" + encoded_key + "]");
    sideChannel.set(object, step);
    const valueSideChannel = /* @__PURE__ */ new WeakMap();
    valueSideChannel.set(sentinel2, sideChannel);
    push_to_array2(values, inner_stringify2(
      value,
      key_prefix,
      generateArrayPrefix,
      commaRoundTrip,
      allowEmptyArrays,
      strictNullHandling,
      skipNulls,
      encodeDotInKeys,
      // @ts-ignore
      generateArrayPrefix === "comma" && encodeValuesOnly && isArray2(obj) ? null : encoder,
      filter,
      sort,
      allowDots,
      serializeDate,
      format,
      formatter,
      encodeValuesOnly,
      charset,
      valueSideChannel
    ));
  }
  return values;
}
__name(inner_stringify2, "inner_stringify");
function normalize_stringify_options2(opts = defaults2) {
  if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") {
    throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  }
  if (typeof opts.encodeDotInKeys !== "undefined" && typeof opts.encodeDotInKeys !== "boolean") {
    throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
  }
  if (opts.encoder !== null && typeof opts.encoder !== "undefined" && typeof opts.encoder !== "function") {
    throw new TypeError("Encoder has to be a function.");
  }
  const charset = opts.charset || defaults2.charset;
  if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") {
    throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  }
  let format = default_format2;
  if (typeof opts.format !== "undefined") {
    if (!has2(formatters2, opts.format)) {
      throw new TypeError("Unknown format option provided.");
    }
    format = opts.format;
  }
  const formatter = formatters2[format];
  let filter = defaults2.filter;
  if (typeof opts.filter === "function" || isArray2(opts.filter)) {
    filter = opts.filter;
  }
  let arrayFormat;
  if (opts.arrayFormat && opts.arrayFormat in array_prefix_generators2) {
    arrayFormat = opts.arrayFormat;
  } else if ("indices" in opts) {
    arrayFormat = opts.indices ? "indices" : "repeat";
  } else {
    arrayFormat = defaults2.arrayFormat;
  }
  if ("commaRoundTrip" in opts && typeof opts.commaRoundTrip !== "boolean") {
    throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
  }
  const allowDots = typeof opts.allowDots === "undefined" ? !!opts.encodeDotInKeys === true ? true : defaults2.allowDots : !!opts.allowDots;
  return {
    addQueryPrefix: typeof opts.addQueryPrefix === "boolean" ? opts.addQueryPrefix : defaults2.addQueryPrefix,
    // @ts-ignore
    allowDots,
    allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults2.allowEmptyArrays,
    arrayFormat,
    charset,
    charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults2.charsetSentinel,
    commaRoundTrip: !!opts.commaRoundTrip,
    delimiter: typeof opts.delimiter === "undefined" ? defaults2.delimiter : opts.delimiter,
    encode: typeof opts.encode === "boolean" ? opts.encode : defaults2.encode,
    encodeDotInKeys: typeof opts.encodeDotInKeys === "boolean" ? opts.encodeDotInKeys : defaults2.encodeDotInKeys,
    encoder: typeof opts.encoder === "function" ? opts.encoder : defaults2.encoder,
    encodeValuesOnly: typeof opts.encodeValuesOnly === "boolean" ? opts.encodeValuesOnly : defaults2.encodeValuesOnly,
    filter,
    format,
    formatter,
    serializeDate: typeof opts.serializeDate === "function" ? opts.serializeDate : defaults2.serializeDate,
    skipNulls: typeof opts.skipNulls === "boolean" ? opts.skipNulls : defaults2.skipNulls,
    // @ts-ignore
    sort: typeof opts.sort === "function" ? opts.sort : null,
    strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults2.strictNullHandling
  };
}
__name(normalize_stringify_options2, "normalize_stringify_options");
function stringify2(object, opts = {}) {
  let obj = object;
  const options = normalize_stringify_options2(opts);
  let obj_keys;
  let filter;
  if (typeof options.filter === "function") {
    filter = options.filter;
    obj = filter("", obj);
  } else if (isArray2(options.filter)) {
    filter = options.filter;
    obj_keys = filter;
  }
  const keys = [];
  if (typeof obj !== "object" || obj === null) {
    return "";
  }
  const generateArrayPrefix = array_prefix_generators2[options.arrayFormat];
  const commaRoundTrip = generateArrayPrefix === "comma" && options.commaRoundTrip;
  if (!obj_keys) {
    obj_keys = Object.keys(obj);
  }
  if (options.sort) {
    obj_keys.sort(options.sort);
  }
  const sideChannel = /* @__PURE__ */ new WeakMap();
  for (let i = 0; i < obj_keys.length; ++i) {
    const key = obj_keys[i];
    if (options.skipNulls && obj[key] === null) {
      continue;
    }
    push_to_array2(keys, inner_stringify2(
      obj[key],
      key,
      // @ts-expect-error
      generateArrayPrefix,
      commaRoundTrip,
      options.allowEmptyArrays,
      options.strictNullHandling,
      options.skipNulls,
      options.encodeDotInKeys,
      options.encode ? options.encoder : null,
      options.filter,
      options.sort,
      options.allowDots,
      options.serializeDate,
      options.format,
      options.formatter,
      options.encodeValuesOnly,
      options.charset,
      sideChannel
    ));
  }
  const joined = keys.join(options.delimiter);
  let prefix = options.addQueryPrefix === true ? "?" : "";
  if (options.charsetSentinel) {
    if (options.charset === "iso-8859-1") {
      prefix += "utf8=%26%2310003%3B&";
    } else {
      prefix += "utf8=%E2%9C%93&";
    }
  }
  return joined.length > 0 ? prefix + joined : "";
}
__name(stringify2, "stringify");

// node_modules/openai/internal/utils/query.mjs
function stringifyQuery(query) {
  return stringify2(query, { arrayFormat: "brackets" });
}
__name(stringifyQuery, "stringifyQuery");

// node_modules/openai/core/pagination.mjs
init_esm();

// node_modules/openai/internal/parse.mjs
init_esm();

// node_modules/openai/core/streaming.mjs
init_esm();

// node_modules/openai/internal/decoders/line.mjs
init_esm();

// node_modules/openai/internal/utils/bytes.mjs
init_esm();
function concatBytes(buffers) {
  let length = 0;
  for (const buffer of buffers) {
    length += buffer.length;
  }
  const output = new Uint8Array(length);
  let index = 0;
  for (const buffer of buffers) {
    output.set(buffer, index);
    index += buffer.length;
  }
  return output;
}
__name(concatBytes, "concatBytes");
var encodeUTF8_;
function encodeUTF8(str2) {
  let encoder;
  return (encodeUTF8_ ?? (encoder = new globalThis.TextEncoder(), encodeUTF8_ = encoder.encode.bind(encoder)))(str2);
}
__name(encodeUTF8, "encodeUTF8");
var decodeUTF8_;
function decodeUTF8(bytes) {
  let decoder;
  return (decodeUTF8_ ?? (decoder = new globalThis.TextDecoder(), decodeUTF8_ = decoder.decode.bind(decoder)))(bytes);
}
__name(decodeUTF8, "decodeUTF8");

// node_modules/openai/internal/decoders/line.mjs
var _LineDecoder_buffer;
var _LineDecoder_carriageReturnIndex;
var LineDecoder = class {
  static {
    __name(this, "LineDecoder");
  }
  constructor() {
    _LineDecoder_buffer.set(this, void 0);
    _LineDecoder_carriageReturnIndex.set(this, void 0);
    __classPrivateFieldSet2(this, _LineDecoder_buffer, new Uint8Array(), "f");
    __classPrivateFieldSet2(this, _LineDecoder_carriageReturnIndex, null, "f");
  }
  decode(chunk) {
    if (chunk == null) {
      return [];
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    __classPrivateFieldSet2(this, _LineDecoder_buffer, concatBytes([__classPrivateFieldGet2(this, _LineDecoder_buffer, "f"), binaryChunk]), "f");
    const lines = [];
    let patternIndex;
    while ((patternIndex = findNewlineIndex(__classPrivateFieldGet2(this, _LineDecoder_buffer, "f"), __classPrivateFieldGet2(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
      if (patternIndex.carriage && __classPrivateFieldGet2(this, _LineDecoder_carriageReturnIndex, "f") == null) {
        __classPrivateFieldSet2(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
        continue;
      }
      if (__classPrivateFieldGet2(this, _LineDecoder_carriageReturnIndex, "f") != null && (patternIndex.index !== __classPrivateFieldGet2(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
        lines.push(decodeUTF8(__classPrivateFieldGet2(this, _LineDecoder_buffer, "f").subarray(0, __classPrivateFieldGet2(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
        __classPrivateFieldSet2(this, _LineDecoder_buffer, __classPrivateFieldGet2(this, _LineDecoder_buffer, "f").subarray(__classPrivateFieldGet2(this, _LineDecoder_carriageReturnIndex, "f")), "f");
        __classPrivateFieldSet2(this, _LineDecoder_carriageReturnIndex, null, "f");
        continue;
      }
      const endIndex = __classPrivateFieldGet2(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
      const line = decodeUTF8(__classPrivateFieldGet2(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
      lines.push(line);
      __classPrivateFieldSet2(this, _LineDecoder_buffer, __classPrivateFieldGet2(this, _LineDecoder_buffer, "f").subarray(patternIndex.index), "f");
      __classPrivateFieldSet2(this, _LineDecoder_carriageReturnIndex, null, "f");
    }
    return lines;
  }
  flush() {
    if (!__classPrivateFieldGet2(this, _LineDecoder_buffer, "f").length) {
      return [];
    }
    return this.decode("\n");
  }
};
_LineDecoder_buffer = /* @__PURE__ */ new WeakMap(), _LineDecoder_carriageReturnIndex = /* @__PURE__ */ new WeakMap();
LineDecoder.NEWLINE_CHARS = /* @__PURE__ */ new Set(["\n", "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function findNewlineIndex(buffer, startIndex) {
  const newline = 10;
  const carriage = 13;
  for (let i = startIndex ?? 0; i < buffer.length; i++) {
    if (buffer[i] === newline) {
      return { preceding: i, index: i + 1, carriage: false };
    }
    if (buffer[i] === carriage) {
      return { preceding: i, index: i + 1, carriage: true };
    }
  }
  return null;
}
__name(findNewlineIndex, "findNewlineIndex");
function findDoubleNewlineIndex(buffer) {
  const newline = 10;
  const carriage = 13;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === newline && buffer[i + 1] === newline) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === carriage) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) {
      return i + 4;
    }
  }
  return -1;
}
__name(findDoubleNewlineIndex, "findDoubleNewlineIndex");

// node_modules/openai/internal/utils/log.mjs
init_esm();
var levelNumbers2 = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500
};
var parseLogLevel2 = /* @__PURE__ */ __name((maybeLevel, sourceName, client) => {
  if (!maybeLevel) {
    return void 0;
  }
  if (hasOwn2(levelNumbers2, maybeLevel)) {
    return maybeLevel;
  }
  loggerFor2(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers2))}`);
  return void 0;
}, "parseLogLevel");
function noop2() {
}
__name(noop2, "noop");
function makeLogFn2(fnLevel, logger2, logLevel) {
  if (!logger2 || levelNumbers2[fnLevel] > levelNumbers2[logLevel]) {
    return noop2;
  } else {
    return logger2[fnLevel].bind(logger2);
  }
}
__name(makeLogFn2, "makeLogFn");
var noopLogger2 = {
  error: noop2,
  warn: noop2,
  info: noop2,
  debug: noop2
};
var cachedLoggers2 = /* @__PURE__ */ new WeakMap();
function loggerFor2(client) {
  const logger2 = client.logger;
  const logLevel = client.logLevel ?? "off";
  if (!logger2) {
    return noopLogger2;
  }
  const cachedLogger = cachedLoggers2.get(logger2);
  if (cachedLogger && cachedLogger[0] === logLevel) {
    return cachedLogger[1];
  }
  const levelLogger = {
    error: makeLogFn2("error", logger2, logLevel),
    warn: makeLogFn2("warn", logger2, logLevel),
    info: makeLogFn2("info", logger2, logLevel),
    debug: makeLogFn2("debug", logger2, logLevel)
  };
  cachedLoggers2.set(logger2, [logLevel, levelLogger]);
  return levelLogger;
}
__name(loggerFor2, "loggerFor");
var formatRequestDetails2 = /* @__PURE__ */ __name((details) => {
  if (details.options) {
    details.options = { ...details.options };
    delete details.options["headers"];
  }
  if (details.headers) {
    details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [
      name,
      name.toLowerCase() === "authorization" || name.toLowerCase() === "cookie" || name.toLowerCase() === "set-cookie" ? "***" : value
    ]));
  }
  if ("retryOfRequestLogID" in details) {
    if (details.retryOfRequestLogID) {
      details.retryOf = details.retryOfRequestLogID;
    }
    delete details.retryOfRequestLogID;
  }
  return details;
}, "formatRequestDetails");

// node_modules/openai/core/streaming.mjs
var _Stream_client;
var Stream = class _Stream {
  static {
    __name(this, "Stream");
  }
  constructor(iterator, controller, client) {
    this.iterator = iterator;
    _Stream_client.set(this, void 0);
    this.controller = controller;
    __classPrivateFieldSet2(this, _Stream_client, client, "f");
  }
  static fromSSEResponse(response, controller, client, synthesizeEventData) {
    let consumed = false;
    const logger2 = client ? loggerFor2(client) : console;
    async function* iterator() {
      if (consumed) {
        throw new OpenAIError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const sse of _iterSSEMessages(response, controller)) {
          if (done)
            continue;
          if (sse.data.startsWith("[DONE]")) {
            done = true;
            continue;
          }
          if (sse.event === null || !sse.event.startsWith("thread.")) {
            let data;
            try {
              data = JSON.parse(sse.data);
            } catch (e) {
              logger2.error(`Could not parse message into JSON:`, sse.data);
              logger2.error(`From chunk:`, sse.raw);
              throw e;
            }
            if (data && data.error) {
              throw new APIError2(void 0, data.error, void 0, response.headers);
            }
            yield synthesizeEventData ? { event: sse.event, data } : data;
          } else {
            let data;
            try {
              data = JSON.parse(sse.data);
            } catch (e) {
              console.error(`Could not parse message into JSON:`, sse.data);
              console.error(`From chunk:`, sse.raw);
              throw e;
            }
            if (sse.event == "error") {
              throw new APIError2(void 0, data.error, data.message, void 0);
            }
            yield { event: sse.event, data };
          }
        }
        done = true;
      } catch (e) {
        if (isAbortError2(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    __name(iterator, "iterator");
    return new _Stream(iterator, controller, client);
  }
  /**
   * Generates a Stream from a newline-separated ReadableStream
   * where each item is a JSON value.
   */
  static fromReadableStream(readableStream, controller, client) {
    let consumed = false;
    async function* iterLines() {
      const lineDecoder = new LineDecoder();
      const iter = ReadableStreamToAsyncIterable(readableStream);
      for await (const chunk of iter) {
        for (const line of lineDecoder.decode(chunk)) {
          yield line;
        }
      }
      for (const line of lineDecoder.flush()) {
        yield line;
      }
    }
    __name(iterLines, "iterLines");
    async function* iterator() {
      if (consumed) {
        throw new OpenAIError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const line of iterLines()) {
          if (done)
            continue;
          if (line)
            yield JSON.parse(line);
        }
        done = true;
      } catch (e) {
        if (isAbortError2(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    __name(iterator, "iterator");
    return new _Stream(iterator, controller, client);
  }
  [(_Stream_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    return this.iterator();
  }
  /**
   * Splits the stream into two streams which can be
   * independently read from at different speeds.
   */
  tee() {
    const left = [];
    const right = [];
    const iterator = this.iterator();
    const teeIterator = /* @__PURE__ */ __name((queue) => {
      return {
        next: /* @__PURE__ */ __name(() => {
          if (queue.length === 0) {
            const result = iterator.next();
            left.push(result);
            right.push(result);
          }
          return queue.shift();
        }, "next")
      };
    }, "teeIterator");
    return [
      new _Stream(() => teeIterator(left), this.controller, __classPrivateFieldGet2(this, _Stream_client, "f")),
      new _Stream(() => teeIterator(right), this.controller, __classPrivateFieldGet2(this, _Stream_client, "f"))
    ];
  }
  /**
   * Converts this stream to a newline-separated ReadableStream of
   * JSON stringified values in the stream
   * which can be turned back into a Stream with `Stream.fromReadableStream()`.
   */
  toReadableStream() {
    const self = this;
    let iter;
    return makeReadableStream2({
      async start() {
        iter = self[Symbol.asyncIterator]();
      },
      async pull(ctrl) {
        try {
          const { value, done } = await iter.next();
          if (done)
            return ctrl.close();
          const bytes = encodeUTF8(JSON.stringify(value) + "\n");
          ctrl.enqueue(bytes);
        } catch (err) {
          ctrl.error(err);
        }
      },
      async cancel() {
        await iter.return?.();
      }
    });
  }
};
async function* _iterSSEMessages(response, controller) {
  if (!response.body) {
    controller.abort();
    if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") {
      throw new OpenAIError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
    }
    throw new OpenAIError(`Attempted to iterate over a response with no body`);
  }
  const sseDecoder = new SSEDecoder();
  const lineDecoder = new LineDecoder();
  const iter = ReadableStreamToAsyncIterable(response.body);
  for await (const sseChunk of iterSSEChunks(iter)) {
    for (const line of lineDecoder.decode(sseChunk)) {
      const sse = sseDecoder.decode(line);
      if (sse)
        yield sse;
    }
  }
  for (const line of lineDecoder.flush()) {
    const sse = sseDecoder.decode(line);
    if (sse)
      yield sse;
  }
}
__name(_iterSSEMessages, "_iterSSEMessages");
async function* iterSSEChunks(iterator) {
  let data = new Uint8Array();
  for await (const chunk of iterator) {
    if (chunk == null) {
      continue;
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    let newData = new Uint8Array(data.length + binaryChunk.length);
    newData.set(data);
    newData.set(binaryChunk, data.length);
    data = newData;
    let patternIndex;
    while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
      yield data.slice(0, patternIndex);
      data = data.slice(patternIndex);
    }
  }
  if (data.length > 0) {
    yield data;
  }
}
__name(iterSSEChunks, "iterSSEChunks");
var SSEDecoder = class {
  static {
    __name(this, "SSEDecoder");
  }
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      if (!this.event && !this.data.length)
        return null;
      const sse = {
        event: this.event,
        data: this.data.join("\n"),
        raw: this.chunks
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    let [fieldname, _, value] = partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    if (fieldname === "event") {
      this.event = value;
    } else if (fieldname === "data") {
      this.data.push(value);
    }
    return null;
  }
};
function partition(str2, delimiter) {
  const index = str2.indexOf(delimiter);
  if (index !== -1) {
    return [str2.substring(0, index), delimiter, str2.substring(index + delimiter.length)];
  }
  return [str2, "", ""];
}
__name(partition, "partition");

// node_modules/openai/internal/parse.mjs
async function defaultParseResponse2(client, props) {
  const { response, requestLogID, retryOfRequestLogID, startTime } = props;
  const body = await (async () => {
    if (props.options.stream) {
      loggerFor2(client).debug("response", response.status, response.url, response.headers, response.body);
      if (props.options.__streamClass) {
        return props.options.__streamClass.fromSSEResponse(response, props.controller, client, props.options.__synthesizeEventData);
      }
      return Stream.fromSSEResponse(response, props.controller, client, props.options.__synthesizeEventData);
    }
    if (response.status === 204) {
      return null;
    }
    if (props.options.__binaryResponse) {
      return response;
    }
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0]?.trim();
    const isJSON = mediaType?.includes("application/json") || mediaType?.endsWith("+json");
    if (isJSON) {
      const contentLength = response.headers.get("content-length");
      if (contentLength === "0") {
        return void 0;
      }
      const json = await response.json();
      return addRequestID(json, response);
    }
    const text = await response.text();
    return text;
  })();
  loggerFor2(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails2({
    retryOfRequestLogID,
    url: response.url,
    status: response.status,
    body,
    durationMs: Date.now() - startTime
  }));
  return body;
}
__name(defaultParseResponse2, "defaultParseResponse");
function addRequestID(value, response) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.defineProperty(value, "_request_id", {
    value: response.headers.get("x-request-id"),
    enumerable: false
  });
}
__name(addRequestID, "addRequestID");

// node_modules/openai/core/api-promise.mjs
init_esm();
var _APIPromise_client2;
var APIPromise2 = class _APIPromise extends Promise {
  static {
    __name(this, "APIPromise");
  }
  constructor(client, responsePromise, parseResponse2 = defaultParseResponse2) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse2;
    _APIPromise_client2.set(this, void 0);
    __classPrivateFieldSet2(this, _APIPromise_client2, client, "f");
  }
  _thenUnwrap(transform2) {
    return new _APIPromise(__classPrivateFieldGet2(this, _APIPromise_client2, "f"), this.responsePromise, async (client, props) => addRequestID(transform2(await this.parseResponse(client, props), props), props.response));
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  /**
   * Gets the parsed response data, the raw `Response` instance and the ID of the request,
   * returned via the X-Request-ID header which is useful for debugging requests and reporting
   * issues to OpenAI.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response, request_id: response.headers.get("x-request-id") };
  }
  parse() {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet2(this, _APIPromise_client2, "f"), data));
    }
    return this.parsedPromise;
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
};
_APIPromise_client2 = /* @__PURE__ */ new WeakMap();

// node_modules/openai/core/pagination.mjs
var _AbstractPage_client;
var AbstractPage = class {
  static {
    __name(this, "AbstractPage");
  }
  constructor(client, response, body, options) {
    _AbstractPage_client.set(this, void 0);
    __classPrivateFieldSet2(this, _AbstractPage_client, client, "f");
    this.options = options;
    this.response = response;
    this.body = body;
  }
  hasNextPage() {
    const items = this.getPaginatedItems();
    if (!items.length)
      return false;
    return this.nextPageRequestOptions() != null;
  }
  async getNextPage() {
    const nextOptions = this.nextPageRequestOptions();
    if (!nextOptions) {
      throw new OpenAIError("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
    }
    return await __classPrivateFieldGet2(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
  }
  async *iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async *[(_AbstractPage_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
};
var PagePromise = class extends APIPromise2 {
  static {
    __name(this, "PagePromise");
  }
  constructor(client, request, Page2) {
    super(client, request, async (client2, props) => new Page2(client2, props.response, await defaultParseResponse2(client2, props), props.options));
  }
  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
};
var Page = class extends AbstractPage {
  static {
    __name(this, "Page");
  }
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.object = body.object;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  nextPageRequestOptions() {
    return null;
  }
};
var CursorPage = class extends AbstractPage {
  static {
    __name(this, "CursorPage");
  }
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    const data = this.getPaginatedItems();
    const id = data[data.length - 1]?.id;
    if (!id) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        after: id
      }
    };
  }
};
var ConversationCursorPage = class extends AbstractPage {
  static {
    __name(this, "ConversationCursorPage");
  }
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.last_id = body.last_id || "";
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    const cursor = this.last_id;
    if (!cursor) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        after: cursor
      }
    };
  }
};

// node_modules/openai/core/uploads.mjs
init_esm();

// node_modules/openai/internal/to-file.mjs
init_esm();

// node_modules/openai/internal/uploads.mjs
init_esm();
var checkFileSupport2 = /* @__PURE__ */ __name(() => {
  if (typeof File === "undefined") {
    const { process: process2 } = globalThis;
    const isOldNode = typeof process2?.versions?.node === "string" && parseInt(process2.versions.node.split(".")) < 20;
    throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
}, "checkFileSupport");
function makeFile2(fileBits, fileName, options) {
  checkFileSupport2();
  return new File(fileBits, fileName ?? "unknown_file", options);
}
__name(makeFile2, "makeFile");
function getName2(value) {
  return (typeof value === "object" && value !== null && ("name" in value && value.name && String(value.name) || "url" in value && value.url && String(value.url) || "filename" in value && value.filename && String(value.filename) || "path" in value && value.path && String(value.path)) || "").split(/[\\/]/).pop() || void 0;
}
__name(getName2, "getName");
var isAsyncIterable2 = /* @__PURE__ */ __name((value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function", "isAsyncIterable");
var maybeMultipartFormRequestOptions = /* @__PURE__ */ __name(async (opts, fetch2) => {
  if (!hasUploadableValue(opts.body))
    return opts;
  return { ...opts, body: await createForm(opts.body, fetch2) };
}, "maybeMultipartFormRequestOptions");
var multipartFormRequestOptions = /* @__PURE__ */ __name(async (opts, fetch2) => {
  return { ...opts, body: await createForm(opts.body, fetch2) };
}, "multipartFormRequestOptions");
var supportsFormDataMap = /* @__PURE__ */ new WeakMap();
function supportsFormData(fetchObject) {
  const fetch2 = typeof fetchObject === "function" ? fetchObject : fetchObject.fetch;
  const cached = supportsFormDataMap.get(fetch2);
  if (cached)
    return cached;
  const promise = (async () => {
    try {
      const FetchResponse = "Response" in fetch2 ? fetch2.Response : (await fetch2("data:,")).constructor;
      const data = new FormData();
      if (data.toString() === await new FetchResponse(data).text()) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  })();
  supportsFormDataMap.set(fetch2, promise);
  return promise;
}
__name(supportsFormData, "supportsFormData");
var createForm = /* @__PURE__ */ __name(async (body, fetch2) => {
  if (!await supportsFormData(fetch2)) {
    throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
  }
  const form = new FormData();
  await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value)));
  return form;
}, "createForm");
var isNamedBlob = /* @__PURE__ */ __name((value) => value instanceof Blob && "name" in value, "isNamedBlob");
var isUploadable = /* @__PURE__ */ __name((value) => typeof value === "object" && value !== null && (value instanceof Response || isAsyncIterable2(value) || isNamedBlob(value)), "isUploadable");
var hasUploadableValue = /* @__PURE__ */ __name((value) => {
  if (isUploadable(value))
    return true;
  if (Array.isArray(value))
    return value.some(hasUploadableValue);
  if (value && typeof value === "object") {
    for (const k in value) {
      if (hasUploadableValue(value[k]))
        return true;
    }
  }
  return false;
}, "hasUploadableValue");
var addFormValue = /* @__PURE__ */ __name(async (form, key, value) => {
  if (value === void 0)
    return;
  if (value == null) {
    throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    form.append(key, String(value));
  } else if (value instanceof Response) {
    form.append(key, makeFile2([await value.blob()], getName2(value)));
  } else if (isAsyncIterable2(value)) {
    form.append(key, makeFile2([await new Response(ReadableStreamFrom2(value)).blob()], getName2(value)));
  } else if (isNamedBlob(value)) {
    form.append(key, value, getName2(value));
  } else if (Array.isArray(value)) {
    await Promise.all(value.map((entry) => addFormValue(form, key + "[]", entry)));
  } else if (typeof value === "object") {
    await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop)));
  } else {
    throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
  }
}, "addFormValue");

// node_modules/openai/internal/to-file.mjs
var isBlobLike2 = /* @__PURE__ */ __name((value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function", "isBlobLike");
var isFileLike2 = /* @__PURE__ */ __name((value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike2(value), "isFileLike");
var isResponseLike2 = /* @__PURE__ */ __name((value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function", "isResponseLike");
async function toFile2(value, name, options) {
  checkFileSupport2();
  value = await value;
  if (isFileLike2(value)) {
    if (value instanceof File) {
      return value;
    }
    return makeFile2([await value.arrayBuffer()], value.name);
  }
  if (isResponseLike2(value)) {
    const blob = await value.blob();
    name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
    return makeFile2(await getBytes2(blob), name, options);
  }
  const parts = await getBytes2(value);
  name || (name = getName2(value));
  if (!options?.type) {
    const type = parts.find((part) => typeof part === "object" && "type" in part && part.type);
    if (typeof type === "string") {
      options = { ...options, type };
    }
  }
  return makeFile2(parts, name, options);
}
__name(toFile2, "toFile");
async function getBytes2(value) {
  let parts = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
  value instanceof ArrayBuffer) {
    parts.push(value);
  } else if (isBlobLike2(value)) {
    parts.push(value instanceof Blob ? value : await value.arrayBuffer());
  } else if (isAsyncIterable2(value)) {
    for await (const chunk of value) {
      parts.push(...await getBytes2(chunk));
    }
  } else {
    const constructor = value?.constructor?.name;
    throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError2(value)}`);
  }
  return parts;
}
__name(getBytes2, "getBytes");
function propsForError2(value) {
  if (typeof value !== "object" || value === null)
    return "";
  const props = Object.getOwnPropertyNames(value);
  return `; props: [${props.map((p) => `"${p}"`).join(", ")}]`;
}
__name(propsForError2, "propsForError");

// node_modules/openai/resources/index.mjs
init_esm();

// node_modules/openai/resources/chat/index.mjs
init_esm();

// node_modules/openai/resources/chat/chat.mjs
init_esm();

// node_modules/openai/core/resource.mjs
init_esm();
var APIResource2 = class {
  static {
    __name(this, "APIResource");
  }
  constructor(client) {
    this._client = client;
  }
};

// node_modules/openai/resources/chat/completions/completions.mjs
init_esm();

// node_modules/openai/resources/chat/completions/messages.mjs
init_esm();

// node_modules/openai/internal/utils/path.mjs
init_esm();
function encodeURIPath2(str2) {
  return str2.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
__name(encodeURIPath2, "encodeURIPath");
var EMPTY2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
var createPathTagFunction2 = /* @__PURE__ */ __name((pathEncoder = encodeURIPath2) => /* @__PURE__ */ __name(function path4(statics, ...params) {
  if (statics.length === 1)
    return statics[0];
  let postPath = false;
  const invalidSegments = [];
  const path5 = statics.reduce((previousValue, currentValue, index) => {
    if (/[?#]/.test(currentValue)) {
      postPath = true;
    }
    const value = params[index];
    let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
    if (index !== params.length && (value == null || typeof value === "object" && // handle values from other realms
    value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY2) ?? EMPTY2)?.toString)) {
      encoded = value + "";
      invalidSegments.push({
        start: previousValue.length + currentValue.length,
        length: encoded.length,
        error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
      });
    }
    return previousValue + currentValue + (index === params.length ? "" : encoded);
  }, "");
  const pathOnly = path5.split(/[?#]/, 1)[0];
  const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
  let match;
  while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
    invalidSegments.push({
      start: match.index,
      length: match[0].length,
      error: `Value "${match[0]}" can't be safely passed as a path parameter`
    });
  }
  invalidSegments.sort((a, b) => a.start - b.start);
  if (invalidSegments.length > 0) {
    let lastEnd = 0;
    const underline = invalidSegments.reduce((acc, segment) => {
      const spaces = " ".repeat(segment.start - lastEnd);
      const arrows = "^".repeat(segment.length);
      lastEnd = segment.start + segment.length;
      return acc + spaces + arrows;
    }, "");
    throw new OpenAIError(`Path parameters result in path with invalid segments:
${invalidSegments.map((e) => e.error).join("\n")}
${path5}
${underline}`);
  }
  return path5;
}, "path"), "createPathTagFunction");
var path3 = /* @__PURE__ */ createPathTagFunction2(encodeURIPath2);

// node_modules/openai/resources/chat/completions/messages.mjs
var Messages = class extends APIResource2 {
  static {
    __name(this, "Messages");
  }
  /**
   * Get the messages in a stored chat completion. Only Chat Completions that have
   * been created with the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatCompletionStoreMessage of client.chat.completions.messages.list(
   *   'completion_id',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(completionID, query = {}, options) {
    return this._client.getAPIList(path3`/chat/completions/${completionID}/messages`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/lib/ChatCompletionRunner.mjs
init_esm();

// node_modules/openai/lib/AbstractChatCompletionRunner.mjs
init_esm();

// node_modules/openai/error.mjs
init_esm();

// node_modules/openai/lib/parser.mjs
init_esm();
function isChatCompletionFunctionTool(tool) {
  return tool !== void 0 && "function" in tool && tool.function !== void 0;
}
__name(isChatCompletionFunctionTool, "isChatCompletionFunctionTool");
function isAutoParsableResponseFormat(response_format) {
  return response_format?.["$brand"] === "auto-parseable-response-format";
}
__name(isAutoParsableResponseFormat, "isAutoParsableResponseFormat");
function isAutoParsableTool(tool) {
  return tool?.["$brand"] === "auto-parseable-tool";
}
__name(isAutoParsableTool, "isAutoParsableTool");
function maybeParseChatCompletion(completion, params) {
  if (!params || !hasAutoParseableInput(params)) {
    return {
      ...completion,
      choices: completion.choices.map((choice) => {
        assertToolCallsAreChatCompletionFunctionToolCalls(choice.message.tool_calls);
        return {
          ...choice,
          message: {
            ...choice.message,
            parsed: null,
            ...choice.message.tool_calls ? {
              tool_calls: choice.message.tool_calls
            } : void 0
          }
        };
      })
    };
  }
  return parseChatCompletion(completion, params);
}
__name(maybeParseChatCompletion, "maybeParseChatCompletion");
function parseChatCompletion(completion, params) {
  const choices = completion.choices.map((choice) => {
    if (choice.finish_reason === "length") {
      throw new LengthFinishReasonError();
    }
    if (choice.finish_reason === "content_filter") {
      throw new ContentFilterFinishReasonError();
    }
    assertToolCallsAreChatCompletionFunctionToolCalls(choice.message.tool_calls);
    return {
      ...choice,
      message: {
        ...choice.message,
        ...choice.message.tool_calls ? {
          tool_calls: choice.message.tool_calls?.map((toolCall) => parseToolCall(params, toolCall)) ?? void 0
        } : void 0,
        parsed: choice.message.content && !choice.message.refusal ? parseResponseFormat(params, choice.message.content) : null
      }
    };
  });
  return { ...completion, choices };
}
__name(parseChatCompletion, "parseChatCompletion");
function parseResponseFormat(params, content) {
  if (params.response_format?.type !== "json_schema") {
    return null;
  }
  if (params.response_format?.type === "json_schema") {
    if ("$parseRaw" in params.response_format) {
      const response_format = params.response_format;
      return response_format.$parseRaw(content);
    }
    return JSON.parse(content);
  }
  return null;
}
__name(parseResponseFormat, "parseResponseFormat");
function parseToolCall(params, toolCall) {
  const inputTool = params.tools?.find((inputTool2) => isChatCompletionFunctionTool(inputTool2) && inputTool2.function?.name === toolCall.function.name);
  return {
    ...toolCall,
    function: {
      ...toolCall.function,
      parsed_arguments: isAutoParsableTool(inputTool) ? inputTool.$parseRaw(toolCall.function.arguments) : inputTool?.function.strict ? JSON.parse(toolCall.function.arguments) : null
    }
  };
}
__name(parseToolCall, "parseToolCall");
function shouldParseToolCall(params, toolCall) {
  if (!params || !("tools" in params) || !params.tools) {
    return false;
  }
  const inputTool = params.tools?.find((inputTool2) => isChatCompletionFunctionTool(inputTool2) && inputTool2.function?.name === toolCall.function.name);
  return isChatCompletionFunctionTool(inputTool) && (isAutoParsableTool(inputTool) || inputTool?.function.strict || false);
}
__name(shouldParseToolCall, "shouldParseToolCall");
function hasAutoParseableInput(params) {
  if (isAutoParsableResponseFormat(params.response_format)) {
    return true;
  }
  return params.tools?.some((t) => isAutoParsableTool(t) || t.type === "function" && t.function.strict === true) ?? false;
}
__name(hasAutoParseableInput, "hasAutoParseableInput");
function assertToolCallsAreChatCompletionFunctionToolCalls(toolCalls) {
  for (const toolCall of toolCalls || []) {
    if (toolCall.type !== "function") {
      throw new OpenAIError(`Currently only \`function\` tool calls are supported; Received \`${toolCall.type}\``);
    }
  }
}
__name(assertToolCallsAreChatCompletionFunctionToolCalls, "assertToolCallsAreChatCompletionFunctionToolCalls");
function validateInputTools(tools) {
  for (const tool of tools ?? []) {
    if (tool.type !== "function") {
      throw new OpenAIError(`Currently only \`function\` tool types support auto-parsing; Received \`${tool.type}\``);
    }
    if (tool.function.strict !== true) {
      throw new OpenAIError(`The \`${tool.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
    }
  }
}
__name(validateInputTools, "validateInputTools");

// node_modules/openai/lib/chatCompletionUtils.mjs
init_esm();
var isAssistantMessage = /* @__PURE__ */ __name((message) => {
  return message?.role === "assistant";
}, "isAssistantMessage");
var isToolMessage = /* @__PURE__ */ __name((message) => {
  return message?.role === "tool";
}, "isToolMessage");

// node_modules/openai/lib/EventStream.mjs
init_esm();
var _EventStream_instances;
var _EventStream_connectedPromise;
var _EventStream_resolveConnectedPromise;
var _EventStream_rejectConnectedPromise;
var _EventStream_endPromise;
var _EventStream_resolveEndPromise;
var _EventStream_rejectEndPromise;
var _EventStream_listeners;
var _EventStream_ended;
var _EventStream_errored;
var _EventStream_aborted;
var _EventStream_catchingPromiseCreated;
var _EventStream_handleError;
var EventStream = class {
  static {
    __name(this, "EventStream");
  }
  constructor() {
    _EventStream_instances.add(this);
    this.controller = new AbortController();
    _EventStream_connectedPromise.set(this, void 0);
    _EventStream_resolveConnectedPromise.set(this, () => {
    });
    _EventStream_rejectConnectedPromise.set(this, () => {
    });
    _EventStream_endPromise.set(this, void 0);
    _EventStream_resolveEndPromise.set(this, () => {
    });
    _EventStream_rejectEndPromise.set(this, () => {
    });
    _EventStream_listeners.set(this, {});
    _EventStream_ended.set(this, false);
    _EventStream_errored.set(this, false);
    _EventStream_aborted.set(this, false);
    _EventStream_catchingPromiseCreated.set(this, false);
    __classPrivateFieldSet2(this, _EventStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet2(this, _EventStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet2(this, _EventStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet2(this, _EventStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet2(this, _EventStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet2(this, _EventStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet2(this, _EventStream_connectedPromise, "f").catch(() => {
    });
    __classPrivateFieldGet2(this, _EventStream_endPromise, "f").catch(() => {
    });
  }
  _run(executor) {
    setTimeout(() => {
      executor().then(() => {
        this._emitFinal();
        this._emit("end");
      }, __classPrivateFieldGet2(this, _EventStream_instances, "m", _EventStream_handleError).bind(this));
    }, 0);
  }
  _connected() {
    if (this.ended)
      return;
    __classPrivateFieldGet2(this, _EventStream_resolveConnectedPromise, "f").call(this);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet2(this, _EventStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet2(this, _EventStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet2(this, _EventStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  /**
   * Adds the listener function to the end of the listeners array for the event.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of event and listener will result in the listener being added, and
   * called, multiple times.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  on(event, listener) {
    const listeners = __classPrivateFieldGet2(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet2(this, _EventStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  /**
   * Removes the specified listener from the listener array for the event.
   * off() will remove, at most, one instance of a listener from the listener array. If any single
   * listener has been added multiple times to the listener array for the specified event, then
   * off() must be called multiple times to remove each instance.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  off(event, listener) {
    const listeners = __classPrivateFieldGet2(this, _EventStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  /**
   * Adds a one-time listener function for the event. The next time the event is triggered,
   * this listener is removed and then invoked.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  once(event, listener) {
    const listeners = __classPrivateFieldGet2(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet2(this, _EventStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  /**
   * This is similar to `.once()`, but returns a Promise that resolves the next time
   * the event is triggered, instead of calling a listener callback.
   * @returns a Promise that resolves the next time given event is triggered,
   * or rejects if an error is emitted.  (If you request the 'error' event,
   * returns a promise that resolves with the error).
   *
   * Example:
   *
   *   const message = await stream.emitted('message') // rejects if the stream errors
   */
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet2(this, _EventStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet2(this, _EventStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet2(this, _EventStream_endPromise, "f");
  }
  _emit(event, ...args) {
    if (__classPrivateFieldGet2(this, _EventStream_ended, "f")) {
      return;
    }
    if (event === "end") {
      __classPrivateFieldSet2(this, _EventStream_ended, true, "f");
      __classPrivateFieldGet2(this, _EventStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet2(this, _EventStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet2(this, _EventStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args));
    }
    if (event === "abort") {
      const error = args[0];
      if (!__classPrivateFieldGet2(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet2(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet2(this, _EventStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error = args[0];
      if (!__classPrivateFieldGet2(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet2(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet2(this, _EventStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
    }
  }
  _emitFinal() {
  }
};
_EventStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_endPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_listeners = /* @__PURE__ */ new WeakMap(), _EventStream_ended = /* @__PURE__ */ new WeakMap(), _EventStream_errored = /* @__PURE__ */ new WeakMap(), _EventStream_aborted = /* @__PURE__ */ new WeakMap(), _EventStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _EventStream_instances = /* @__PURE__ */ new WeakSet(), _EventStream_handleError = /* @__PURE__ */ __name(function _EventStream_handleError2(error) {
  __classPrivateFieldSet2(this, _EventStream_errored, true, "f");
  if (error instanceof Error && error.name === "AbortError") {
    error = new APIUserAbortError2();
  }
  if (error instanceof APIUserAbortError2) {
    __classPrivateFieldSet2(this, _EventStream_aborted, true, "f");
    return this._emit("abort", error);
  }
  if (error instanceof OpenAIError) {
    return this._emit("error", error);
  }
  if (error instanceof Error) {
    const openAIError = new OpenAIError(error.message);
    openAIError.cause = error;
    return this._emit("error", openAIError);
  }
  return this._emit("error", new OpenAIError(String(error)));
}, "_EventStream_handleError");

// node_modules/openai/lib/RunnableFunction.mjs
init_esm();
function isRunnableFunctionWithParse(fn) {
  return typeof fn.parse === "function";
}
__name(isRunnableFunctionWithParse, "isRunnableFunctionWithParse");

// node_modules/openai/lib/AbstractChatCompletionRunner.mjs
var _AbstractChatCompletionRunner_instances;
var _AbstractChatCompletionRunner_getFinalContent;
var _AbstractChatCompletionRunner_getFinalMessage;
var _AbstractChatCompletionRunner_getFinalFunctionToolCall;
var _AbstractChatCompletionRunner_getFinalFunctionToolCallResult;
var _AbstractChatCompletionRunner_calculateTotalUsage;
var _AbstractChatCompletionRunner_validateParams;
var _AbstractChatCompletionRunner_stringifyFunctionCallResult;
var DEFAULT_MAX_CHAT_COMPLETIONS = 10;
var AbstractChatCompletionRunner = class extends EventStream {
  static {
    __name(this, "AbstractChatCompletionRunner");
  }
  constructor() {
    super(...arguments);
    _AbstractChatCompletionRunner_instances.add(this);
    this._chatCompletions = [];
    this.messages = [];
  }
  _addChatCompletion(chatCompletion) {
    this._chatCompletions.push(chatCompletion);
    this._emit("chatCompletion", chatCompletion);
    const message = chatCompletion.choices[0]?.message;
    if (message)
      this._addMessage(message);
    return chatCompletion;
  }
  _addMessage(message, emit = true) {
    if (!("content" in message))
      message.content = null;
    this.messages.push(message);
    if (emit) {
      this._emit("message", message);
      if (isToolMessage(message) && message.content) {
        this._emit("functionToolCallResult", message.content);
      } else if (isAssistantMessage(message) && message.tool_calls) {
        for (const tool_call of message.tool_calls) {
          if (tool_call.type === "function") {
            this._emit("functionToolCall", tool_call.function);
          }
        }
      }
    }
  }
  /**
   * @returns a promise that resolves with the final ChatCompletion, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletion.
   */
  async finalChatCompletion() {
    await this.done();
    const completion = this._chatCompletions[this._chatCompletions.length - 1];
    if (!completion)
      throw new OpenAIError("stream ended without producing a ChatCompletion");
    return completion;
  }
  /**
   * @returns a promise that resolves with the content of the final ChatCompletionMessage, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalContent() {
    await this.done();
    return __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
  }
  /**
   * @returns a promise that resolves with the the final assistant ChatCompletionMessage response,
   * or rejects if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
  }
  /**
   * @returns a promise that resolves with the content of the final FunctionCall, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalFunctionToolCall() {
    await this.done();
    return __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
  }
  async finalFunctionToolCallResult() {
    await this.done();
    return __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
  }
  async totalUsage() {
    await this.done();
    return __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this);
  }
  allChatCompletions() {
    return [...this._chatCompletions];
  }
  _emitFinal() {
    const completion = this._chatCompletions[this._chatCompletions.length - 1];
    if (completion)
      this._emit("finalChatCompletion", completion);
    const finalMessage = __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
    if (finalMessage)
      this._emit("finalMessage", finalMessage);
    const finalContent = __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
    if (finalContent)
      this._emit("finalContent", finalContent);
    const finalFunctionCall = __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
    if (finalFunctionCall)
      this._emit("finalFunctionToolCall", finalFunctionCall);
    const finalFunctionCallResult = __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
    if (finalFunctionCallResult != null)
      this._emit("finalFunctionToolCallResult", finalFunctionCallResult);
    if (this._chatCompletions.some((c) => c.usage)) {
      this._emit("totalUsage", __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this));
    }
  }
  async _createChatCompletion(client, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_validateParams).call(this, params);
    const chatCompletion = await client.chat.completions.create({ ...params, stream: false }, { ...options, signal: this.controller.signal });
    this._connected();
    return this._addChatCompletion(parseChatCompletion(chatCompletion, params));
  }
  async _runChatCompletion(client, params, options) {
    for (const message of params.messages) {
      this._addMessage(message, false);
    }
    return await this._createChatCompletion(client, params, options);
  }
  async _runTools(client, params, options) {
    const role = "tool";
    const { tool_choice = "auto", stream, ...restParams } = params;
    const singleFunctionToCall = typeof tool_choice !== "string" && tool_choice.type === "function" && tool_choice?.function?.name;
    const { maxChatCompletions = DEFAULT_MAX_CHAT_COMPLETIONS } = options || {};
    const inputTools = params.tools.map((tool) => {
      if (isAutoParsableTool(tool)) {
        if (!tool.$callback) {
          throw new OpenAIError("Tool given to `.runTools()` that does not have an associated function");
        }
        return {
          type: "function",
          function: {
            function: tool.$callback,
            name: tool.function.name,
            description: tool.function.description || "",
            parameters: tool.function.parameters,
            parse: tool.$parseRaw,
            strict: true
          }
        };
      }
      return tool;
    });
    const functionsByName = {};
    for (const f of inputTools) {
      if (f.type === "function") {
        functionsByName[f.function.name || f.function.function.name] = f.function;
      }
    }
    const tools = "tools" in params ? inputTools.map((t) => t.type === "function" ? {
      type: "function",
      function: {
        name: t.function.name || t.function.function.name,
        parameters: t.function.parameters,
        description: t.function.description,
        strict: t.function.strict
      }
    } : t) : void 0;
    for (const message of params.messages) {
      this._addMessage(message, false);
    }
    for (let i = 0; i < maxChatCompletions; ++i) {
      const chatCompletion = await this._createChatCompletion(client, {
        ...restParams,
        tool_choice,
        tools,
        messages: [...this.messages]
      }, options);
      const message = chatCompletion.choices[0]?.message;
      if (!message) {
        throw new OpenAIError(`missing message in ChatCompletion response`);
      }
      if (!message.tool_calls?.length) {
        return;
      }
      for (const tool_call of message.tool_calls) {
        if (tool_call.type !== "function")
          continue;
        const tool_call_id = tool_call.id;
        const { name, arguments: args } = tool_call.function;
        const fn = functionsByName[name];
        if (!fn) {
          const content2 = `Invalid tool_call: ${JSON.stringify(name)}. Available options are: ${Object.keys(functionsByName).map((name2) => JSON.stringify(name2)).join(", ")}. Please try again`;
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        } else if (singleFunctionToCall && singleFunctionToCall !== name) {
          const content2 = `Invalid tool_call: ${JSON.stringify(name)}. ${JSON.stringify(singleFunctionToCall)} requested. Please try again`;
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        }
        let parsed;
        try {
          parsed = isRunnableFunctionWithParse(fn) ? await fn.parse(args) : args;
        } catch (error) {
          const content2 = error instanceof Error ? error.message : String(error);
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        }
        const rawContent = await fn.function(parsed, this);
        const content = __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_stringifyFunctionCallResult).call(this, rawContent);
        this._addMessage({ role, tool_call_id, content });
        if (singleFunctionToCall) {
          return;
        }
      }
    }
    return;
  }
};
_AbstractChatCompletionRunner_instances = /* @__PURE__ */ new WeakSet(), _AbstractChatCompletionRunner_getFinalContent = /* @__PURE__ */ __name(function _AbstractChatCompletionRunner_getFinalContent2() {
  return __classPrivateFieldGet2(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this).content ?? null;
}, "_AbstractChatCompletionRunner_getFinalContent"), _AbstractChatCompletionRunner_getFinalMessage = /* @__PURE__ */ __name(function _AbstractChatCompletionRunner_getFinalMessage2() {
  let i = this.messages.length;
  while (i-- > 0) {
    const message = this.messages[i];
    if (isAssistantMessage(message)) {
      const ret = {
        ...message,
        content: message.content ?? null,
        refusal: message.refusal ?? null
      };
      return ret;
    }
  }
  throw new OpenAIError("stream ended without producing a ChatCompletionMessage with role=assistant");
}, "_AbstractChatCompletionRunner_getFinalMessage"), _AbstractChatCompletionRunner_getFinalFunctionToolCall = /* @__PURE__ */ __name(function _AbstractChatCompletionRunner_getFinalFunctionToolCall2() {
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (isAssistantMessage(message) && message?.tool_calls?.length) {
      return message.tool_calls.filter((x) => x.type === "function").at(-1)?.function;
    }
  }
  return;
}, "_AbstractChatCompletionRunner_getFinalFunctionToolCall"), _AbstractChatCompletionRunner_getFinalFunctionToolCallResult = /* @__PURE__ */ __name(function _AbstractChatCompletionRunner_getFinalFunctionToolCallResult2() {
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (isToolMessage(message) && message.content != null && typeof message.content === "string" && this.messages.some((x) => x.role === "assistant" && x.tool_calls?.some((y) => y.type === "function" && y.id === message.tool_call_id))) {
      return message.content;
    }
  }
  return;
}, "_AbstractChatCompletionRunner_getFinalFunctionToolCallResult"), _AbstractChatCompletionRunner_calculateTotalUsage = /* @__PURE__ */ __name(function _AbstractChatCompletionRunner_calculateTotalUsage2() {
  const total = {
    completion_tokens: 0,
    prompt_tokens: 0,
    total_tokens: 0
  };
  for (const { usage } of this._chatCompletions) {
    if (usage) {
      total.completion_tokens += usage.completion_tokens;
      total.prompt_tokens += usage.prompt_tokens;
      total.total_tokens += usage.total_tokens;
    }
  }
  return total;
}, "_AbstractChatCompletionRunner_calculateTotalUsage"), _AbstractChatCompletionRunner_validateParams = /* @__PURE__ */ __name(function _AbstractChatCompletionRunner_validateParams2(params) {
  if (params.n != null && params.n > 1) {
    throw new OpenAIError("ChatCompletion convenience helpers only support n=1 at this time. To use n>1, please use chat.completions.create() directly.");
  }
}, "_AbstractChatCompletionRunner_validateParams"), _AbstractChatCompletionRunner_stringifyFunctionCallResult = /* @__PURE__ */ __name(function _AbstractChatCompletionRunner_stringifyFunctionCallResult2(rawContent) {
  return typeof rawContent === "string" ? rawContent : rawContent === void 0 ? "undefined" : JSON.stringify(rawContent);
}, "_AbstractChatCompletionRunner_stringifyFunctionCallResult");

// node_modules/openai/lib/ChatCompletionRunner.mjs
var ChatCompletionRunner = class _ChatCompletionRunner extends AbstractChatCompletionRunner {
  static {
    __name(this, "ChatCompletionRunner");
  }
  static runTools(client, params, options) {
    const runner = new _ChatCompletionRunner();
    const opts = {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "runTools" }
    };
    runner._run(() => runner._runTools(client, params, opts));
    return runner;
  }
  _addMessage(message, emit = true) {
    super._addMessage(message, emit);
    if (isAssistantMessage(message) && message.content) {
      this._emit("content", message.content);
    }
  }
};

// node_modules/openai/lib/ChatCompletionStreamingRunner.mjs
init_esm();

// node_modules/openai/lib/ChatCompletionStream.mjs
init_esm();

// node_modules/openai/_vendor/partial-json-parser/parser.mjs
init_esm();
var STR = 1;
var NUM = 2;
var ARR = 4;
var OBJ = 8;
var NULL = 16;
var BOOL = 32;
var NAN = 64;
var INFINITY = 128;
var MINUS_INFINITY = 256;
var INF = INFINITY | MINUS_INFINITY;
var SPECIAL = NULL | BOOL | INF | NAN;
var ATOM = STR | NUM | SPECIAL;
var COLLECTION = ARR | OBJ;
var ALL = ATOM | COLLECTION;
var Allow = {
  STR,
  NUM,
  ARR,
  OBJ,
  NULL,
  BOOL,
  NAN,
  INFINITY,
  MINUS_INFINITY,
  INF,
  SPECIAL,
  ATOM,
  COLLECTION,
  ALL
};
var PartialJSON = class extends Error {
  static {
    __name(this, "PartialJSON");
  }
};
var MalformedJSON = class extends Error {
  static {
    __name(this, "MalformedJSON");
  }
};
function parseJSON(jsonString, allowPartial = Allow.ALL) {
  if (typeof jsonString !== "string") {
    throw new TypeError(`expecting str, got ${typeof jsonString}`);
  }
  if (!jsonString.trim()) {
    throw new Error(`${jsonString} is empty`);
  }
  return _parseJSON(jsonString.trim(), allowPartial);
}
__name(parseJSON, "parseJSON");
var _parseJSON = /* @__PURE__ */ __name((jsonString, allow) => {
  const length = jsonString.length;
  let index = 0;
  const markPartialJSON = /* @__PURE__ */ __name((msg) => {
    throw new PartialJSON(`${msg} at position ${index}`);
  }, "markPartialJSON");
  const throwMalformedError = /* @__PURE__ */ __name((msg) => {
    throw new MalformedJSON(`${msg} at position ${index}`);
  }, "throwMalformedError");
  const parseAny = /* @__PURE__ */ __name(() => {
    skipBlank();
    if (index >= length)
      markPartialJSON("Unexpected end of input");
    if (jsonString[index] === '"')
      return parseStr();
    if (jsonString[index] === "{")
      return parseObj();
    if (jsonString[index] === "[")
      return parseArr();
    if (jsonString.substring(index, index + 4) === "null" || Allow.NULL & allow && length - index < 4 && "null".startsWith(jsonString.substring(index))) {
      index += 4;
      return null;
    }
    if (jsonString.substring(index, index + 4) === "true" || Allow.BOOL & allow && length - index < 4 && "true".startsWith(jsonString.substring(index))) {
      index += 4;
      return true;
    }
    if (jsonString.substring(index, index + 5) === "false" || Allow.BOOL & allow && length - index < 5 && "false".startsWith(jsonString.substring(index))) {
      index += 5;
      return false;
    }
    if (jsonString.substring(index, index + 8) === "Infinity" || Allow.INFINITY & allow && length - index < 8 && "Infinity".startsWith(jsonString.substring(index))) {
      index += 8;
      return Infinity;
    }
    if (jsonString.substring(index, index + 9) === "-Infinity" || Allow.MINUS_INFINITY & allow && 1 < length - index && length - index < 9 && "-Infinity".startsWith(jsonString.substring(index))) {
      index += 9;
      return -Infinity;
    }
    if (jsonString.substring(index, index + 3) === "NaN" || Allow.NAN & allow && length - index < 3 && "NaN".startsWith(jsonString.substring(index))) {
      index += 3;
      return NaN;
    }
    return parseNum();
  }, "parseAny");
  const parseStr = /* @__PURE__ */ __name(() => {
    const start = index;
    let escape2 = false;
    index++;
    while (index < length && (jsonString[index] !== '"' || escape2 && jsonString[index - 1] === "\\")) {
      escape2 = jsonString[index] === "\\" ? !escape2 : false;
      index++;
    }
    if (jsonString.charAt(index) == '"') {
      try {
        return JSON.parse(jsonString.substring(start, ++index - Number(escape2)));
      } catch (e) {
        throwMalformedError(String(e));
      }
    } else if (Allow.STR & allow) {
      try {
        return JSON.parse(jsonString.substring(start, index - Number(escape2)) + '"');
      } catch (e) {
        return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("\\")) + '"');
      }
    }
    markPartialJSON("Unterminated string literal");
  }, "parseStr");
  const parseObj = /* @__PURE__ */ __name(() => {
    index++;
    skipBlank();
    const obj = {};
    try {
      while (jsonString[index] !== "}") {
        skipBlank();
        if (index >= length && Allow.OBJ & allow)
          return obj;
        const key = parseStr();
        skipBlank();
        index++;
        try {
          const value = parseAny();
          Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
        } catch (e) {
          if (Allow.OBJ & allow)
            return obj;
          else
            throw e;
        }
        skipBlank();
        if (jsonString[index] === ",")
          index++;
      }
    } catch (e) {
      if (Allow.OBJ & allow)
        return obj;
      else
        markPartialJSON("Expected '}' at end of object");
    }
    index++;
    return obj;
  }, "parseObj");
  const parseArr = /* @__PURE__ */ __name(() => {
    index++;
    const arr = [];
    try {
      while (jsonString[index] !== "]") {
        arr.push(parseAny());
        skipBlank();
        if (jsonString[index] === ",") {
          index++;
        }
      }
    } catch (e) {
      if (Allow.ARR & allow) {
        return arr;
      }
      markPartialJSON("Expected ']' at end of array");
    }
    index++;
    return arr;
  }, "parseArr");
  const parseNum = /* @__PURE__ */ __name(() => {
    if (index === 0) {
      if (jsonString === "-" && Allow.NUM & allow)
        markPartialJSON("Not sure what '-' is");
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        if (Allow.NUM & allow) {
          try {
            if ("." === jsonString[jsonString.length - 1])
              return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf(".")));
            return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf("e")));
          } catch (e2) {
          }
        }
        throwMalformedError(String(e));
      }
    }
    const start = index;
    if (jsonString[index] === "-")
      index++;
    while (jsonString[index] && !",]}".includes(jsonString[index]))
      index++;
    if (index == length && !(Allow.NUM & allow))
      markPartialJSON("Unterminated number literal");
    try {
      return JSON.parse(jsonString.substring(start, index));
    } catch (e) {
      if (jsonString.substring(start, index) === "-" && Allow.NUM & allow)
        markPartialJSON("Not sure what '-' is");
      try {
        return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("e")));
      } catch (e2) {
        throwMalformedError(String(e2));
      }
    }
  }, "parseNum");
  const skipBlank = /* @__PURE__ */ __name(() => {
    while (index < length && " \n\r	".includes(jsonString[index])) {
      index++;
    }
  }, "skipBlank");
  return parseAny();
}, "_parseJSON");
var partialParse = /* @__PURE__ */ __name((input) => parseJSON(input, Allow.ALL ^ Allow.NUM), "partialParse");

// node_modules/openai/streaming.mjs
init_esm();

// node_modules/openai/lib/ChatCompletionStream.mjs
var _ChatCompletionStream_instances;
var _ChatCompletionStream_params;
var _ChatCompletionStream_choiceEventStates;
var _ChatCompletionStream_currentChatCompletionSnapshot;
var _ChatCompletionStream_beginRequest;
var _ChatCompletionStream_getChoiceEventState;
var _ChatCompletionStream_addChunk;
var _ChatCompletionStream_emitToolCallDoneEvent;
var _ChatCompletionStream_emitContentDoneEvents;
var _ChatCompletionStream_endRequest;
var _ChatCompletionStream_getAutoParseableResponseFormat;
var _ChatCompletionStream_accumulateChatCompletion;
var ChatCompletionStream = class _ChatCompletionStream extends AbstractChatCompletionRunner {
  static {
    __name(this, "ChatCompletionStream");
  }
  constructor(params) {
    super();
    _ChatCompletionStream_instances.add(this);
    _ChatCompletionStream_params.set(this, void 0);
    _ChatCompletionStream_choiceEventStates.set(this, void 0);
    _ChatCompletionStream_currentChatCompletionSnapshot.set(this, void 0);
    __classPrivateFieldSet2(this, _ChatCompletionStream_params, params, "f");
    __classPrivateFieldSet2(this, _ChatCompletionStream_choiceEventStates, [], "f");
  }
  get currentChatCompletionSnapshot() {
    return __classPrivateFieldGet2(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
  }
  /**
   * Intended for use on the frontend, consuming a stream produced with
   * `.toReadableStream()` on the backend.
   *
   * Note that messages sent to the model do not appear in `.on('message')`
   * in this context.
   */
  static fromReadableStream(stream) {
    const runner = new _ChatCompletionStream(null);
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createChatCompletion(client, params, options) {
    const runner = new _ChatCompletionStream(params);
    runner._run(() => runner._runChatCompletion(client, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  async _createChatCompletion(client, params, options) {
    super._createChatCompletion;
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
    const stream = await client.chat.completions.create({ ...params, stream: true }, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const chunk of stream) {
      __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError2();
    }
    return this._addChatCompletion(__classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
    this._connected();
    const stream = Stream.fromReadableStream(readableStream, this.controller);
    let chatId;
    for await (const chunk of stream) {
      if (chatId && chatId !== chunk.id) {
        this._addChatCompletion(__classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
      }
      __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
      chatId = chunk.id;
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError2();
    }
    return this._addChatCompletion(__classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
  }
  [(_ChatCompletionStream_params = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_choiceEventStates = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_currentChatCompletionSnapshot = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_instances = /* @__PURE__ */ new WeakSet(), _ChatCompletionStream_beginRequest = /* @__PURE__ */ __name(function _ChatCompletionStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet2(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
  }, "_ChatCompletionStream_beginRequest"), _ChatCompletionStream_getChoiceEventState = /* @__PURE__ */ __name(function _ChatCompletionStream_getChoiceEventState2(choice) {
    let state = __classPrivateFieldGet2(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index];
    if (state) {
      return state;
    }
    state = {
      content_done: false,
      refusal_done: false,
      logprobs_content_done: false,
      logprobs_refusal_done: false,
      done_tool_calls: /* @__PURE__ */ new Set(),
      current_tool_call_index: null
    };
    __classPrivateFieldGet2(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index] = state;
    return state;
  }, "_ChatCompletionStream_getChoiceEventState"), _ChatCompletionStream_addChunk = /* @__PURE__ */ __name(function _ChatCompletionStream_addChunk2(chunk) {
    if (this.ended)
      return;
    const completion = __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_accumulateChatCompletion).call(this, chunk);
    this._emit("chunk", chunk, completion);
    for (const choice of chunk.choices) {
      const choiceSnapshot = completion.choices[choice.index];
      if (choice.delta.content != null && choiceSnapshot.message?.role === "assistant" && choiceSnapshot.message?.content) {
        this._emit("content", choice.delta.content, choiceSnapshot.message.content);
        this._emit("content.delta", {
          delta: choice.delta.content,
          snapshot: choiceSnapshot.message.content,
          parsed: choiceSnapshot.message.parsed
        });
      }
      if (choice.delta.refusal != null && choiceSnapshot.message?.role === "assistant" && choiceSnapshot.message?.refusal) {
        this._emit("refusal.delta", {
          delta: choice.delta.refusal,
          snapshot: choiceSnapshot.message.refusal
        });
      }
      if (choice.logprobs?.content != null && choiceSnapshot.message?.role === "assistant") {
        this._emit("logprobs.content.delta", {
          content: choice.logprobs?.content,
          snapshot: choiceSnapshot.logprobs?.content ?? []
        });
      }
      if (choice.logprobs?.refusal != null && choiceSnapshot.message?.role === "assistant") {
        this._emit("logprobs.refusal.delta", {
          refusal: choice.logprobs?.refusal,
          snapshot: choiceSnapshot.logprobs?.refusal ?? []
        });
      }
      const state = __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
      if (choiceSnapshot.finish_reason) {
        __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
        if (state.current_tool_call_index != null) {
          __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
        }
      }
      for (const toolCall of choice.delta.tool_calls ?? []) {
        if (state.current_tool_call_index !== toolCall.index) {
          __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
          if (state.current_tool_call_index != null) {
            __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
          }
        }
        state.current_tool_call_index = toolCall.index;
      }
      for (const toolCallDelta of choice.delta.tool_calls ?? []) {
        const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallDelta.index];
        if (!toolCallSnapshot?.type) {
          continue;
        }
        if (toolCallSnapshot?.type === "function") {
          this._emit("tool_calls.function.arguments.delta", {
            name: toolCallSnapshot.function?.name,
            index: toolCallDelta.index,
            arguments: toolCallSnapshot.function.arguments,
            parsed_arguments: toolCallSnapshot.function.parsed_arguments,
            arguments_delta: toolCallDelta.function?.arguments ?? ""
          });
        } else {
          assertNever(toolCallSnapshot?.type);
        }
      }
    }
  }, "_ChatCompletionStream_addChunk"), _ChatCompletionStream_emitToolCallDoneEvent = /* @__PURE__ */ __name(function _ChatCompletionStream_emitToolCallDoneEvent2(choiceSnapshot, toolCallIndex) {
    const state = __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
    if (state.done_tool_calls.has(toolCallIndex)) {
      return;
    }
    const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallIndex];
    if (!toolCallSnapshot) {
      throw new Error("no tool call snapshot");
    }
    if (!toolCallSnapshot.type) {
      throw new Error("tool call snapshot missing `type`");
    }
    if (toolCallSnapshot.type === "function") {
      const inputTool = __classPrivateFieldGet2(this, _ChatCompletionStream_params, "f")?.tools?.find((tool) => isChatCompletionFunctionTool(tool) && tool.function.name === toolCallSnapshot.function.name);
      this._emit("tool_calls.function.arguments.done", {
        name: toolCallSnapshot.function.name,
        index: toolCallIndex,
        arguments: toolCallSnapshot.function.arguments,
        parsed_arguments: isAutoParsableTool(inputTool) ? inputTool.$parseRaw(toolCallSnapshot.function.arguments) : inputTool?.function.strict ? JSON.parse(toolCallSnapshot.function.arguments) : null
      });
    } else {
      assertNever(toolCallSnapshot.type);
    }
  }, "_ChatCompletionStream_emitToolCallDoneEvent"), _ChatCompletionStream_emitContentDoneEvents = /* @__PURE__ */ __name(function _ChatCompletionStream_emitContentDoneEvents2(choiceSnapshot) {
    const state = __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
    if (choiceSnapshot.message.content && !state.content_done) {
      state.content_done = true;
      const responseFormat = __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this);
      this._emit("content.done", {
        content: choiceSnapshot.message.content,
        parsed: responseFormat ? responseFormat.$parseRaw(choiceSnapshot.message.content) : null
      });
    }
    if (choiceSnapshot.message.refusal && !state.refusal_done) {
      state.refusal_done = true;
      this._emit("refusal.done", { refusal: choiceSnapshot.message.refusal });
    }
    if (choiceSnapshot.logprobs?.content && !state.logprobs_content_done) {
      state.logprobs_content_done = true;
      this._emit("logprobs.content.done", { content: choiceSnapshot.logprobs.content });
    }
    if (choiceSnapshot.logprobs?.refusal && !state.logprobs_refusal_done) {
      state.logprobs_refusal_done = true;
      this._emit("logprobs.refusal.done", { refusal: choiceSnapshot.logprobs.refusal });
    }
  }, "_ChatCompletionStream_emitContentDoneEvents"), _ChatCompletionStream_endRequest = /* @__PURE__ */ __name(function _ChatCompletionStream_endRequest2() {
    if (this.ended) {
      throw new OpenAIError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet2(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
    if (!snapshot) {
      throw new OpenAIError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet2(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
    __classPrivateFieldSet2(this, _ChatCompletionStream_choiceEventStates, [], "f");
    return finalizeChatCompletion(snapshot, __classPrivateFieldGet2(this, _ChatCompletionStream_params, "f"));
  }, "_ChatCompletionStream_endRequest"), _ChatCompletionStream_getAutoParseableResponseFormat = /* @__PURE__ */ __name(function _ChatCompletionStream_getAutoParseableResponseFormat2() {
    const responseFormat = __classPrivateFieldGet2(this, _ChatCompletionStream_params, "f")?.response_format;
    if (isAutoParsableResponseFormat(responseFormat)) {
      return responseFormat;
    }
    return null;
  }, "_ChatCompletionStream_getAutoParseableResponseFormat"), _ChatCompletionStream_accumulateChatCompletion = /* @__PURE__ */ __name(function _ChatCompletionStream_accumulateChatCompletion2(chunk) {
    var _a4, _b, _c, _d;
    let snapshot = __classPrivateFieldGet2(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
    const { choices, ...rest } = chunk;
    if (!snapshot) {
      snapshot = __classPrivateFieldSet2(this, _ChatCompletionStream_currentChatCompletionSnapshot, {
        ...rest,
        choices: []
      }, "f");
    } else {
      Object.assign(snapshot, rest);
    }
    for (const { delta, finish_reason, index, logprobs = null, ...other } of chunk.choices) {
      let choice = snapshot.choices[index];
      if (!choice) {
        choice = snapshot.choices[index] = { finish_reason, index, message: {}, logprobs, ...other };
      }
      if (logprobs) {
        if (!choice.logprobs) {
          choice.logprobs = Object.assign({}, logprobs);
        } else {
          const { content: content2, refusal: refusal2, ...rest3 } = logprobs;
          assertIsEmpty(rest3);
          Object.assign(choice.logprobs, rest3);
          if (content2) {
            (_a4 = choice.logprobs).content ?? (_a4.content = []);
            choice.logprobs.content.push(...content2);
          }
          if (refusal2) {
            (_b = choice.logprobs).refusal ?? (_b.refusal = []);
            choice.logprobs.refusal.push(...refusal2);
          }
        }
      }
      if (finish_reason) {
        choice.finish_reason = finish_reason;
        if (__classPrivateFieldGet2(this, _ChatCompletionStream_params, "f") && hasAutoParseableInput(__classPrivateFieldGet2(this, _ChatCompletionStream_params, "f"))) {
          if (finish_reason === "length") {
            throw new LengthFinishReasonError();
          }
          if (finish_reason === "content_filter") {
            throw new ContentFilterFinishReasonError();
          }
        }
      }
      Object.assign(choice, other);
      if (!delta)
        continue;
      const { content, refusal, function_call, role, tool_calls, ...rest2 } = delta;
      assertIsEmpty(rest2);
      Object.assign(choice.message, rest2);
      if (refusal) {
        choice.message.refusal = (choice.message.refusal || "") + refusal;
      }
      if (role)
        choice.message.role = role;
      if (function_call) {
        if (!choice.message.function_call) {
          choice.message.function_call = function_call;
        } else {
          if (function_call.name)
            choice.message.function_call.name = function_call.name;
          if (function_call.arguments) {
            (_c = choice.message.function_call).arguments ?? (_c.arguments = "");
            choice.message.function_call.arguments += function_call.arguments;
          }
        }
      }
      if (content) {
        choice.message.content = (choice.message.content || "") + content;
        if (!choice.message.refusal && __classPrivateFieldGet2(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this)) {
          choice.message.parsed = partialParse(choice.message.content);
        }
      }
      if (tool_calls) {
        if (!choice.message.tool_calls)
          choice.message.tool_calls = [];
        for (const { index: index2, id, type, function: fn, ...rest3 } of tool_calls) {
          const tool_call = (_d = choice.message.tool_calls)[index2] ?? (_d[index2] = {});
          Object.assign(tool_call, rest3);
          if (id)
            tool_call.id = id;
          if (type)
            tool_call.type = type;
          if (fn)
            tool_call.function ?? (tool_call.function = { name: fn.name ?? "", arguments: "" });
          if (fn?.name)
            tool_call.function.name = fn.name;
          if (fn?.arguments) {
            tool_call.function.arguments += fn.arguments;
            if (shouldParseToolCall(__classPrivateFieldGet2(this, _ChatCompletionStream_params, "f"), tool_call)) {
              tool_call.function.parsed_arguments = partialParse(tool_call.function.arguments);
            }
          }
        }
      }
    }
    return snapshot;
  }, "_ChatCompletionStream_accumulateChatCompletion"), Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("chunk", (chunk) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(chunk);
      } else {
        pushQueue.push(chunk);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: /* @__PURE__ */ __name(async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      }, "next"),
      return: /* @__PURE__ */ __name(async () => {
        this.abort();
        return { value: void 0, done: true };
      }, "return")
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
};
function finalizeChatCompletion(snapshot, params) {
  const { id, choices, created, model, system_fingerprint, ...rest } = snapshot;
  const completion = {
    ...rest,
    id,
    choices: choices.map(({ message, finish_reason, index, logprobs, ...choiceRest }) => {
      if (!finish_reason) {
        throw new OpenAIError(`missing finish_reason for choice ${index}`);
      }
      const { content = null, function_call, tool_calls, ...messageRest } = message;
      const role = message.role;
      if (!role) {
        throw new OpenAIError(`missing role for choice ${index}`);
      }
      if (function_call) {
        const { arguments: args, name } = function_call;
        if (args == null) {
          throw new OpenAIError(`missing function_call.arguments for choice ${index}`);
        }
        if (!name) {
          throw new OpenAIError(`missing function_call.name for choice ${index}`);
        }
        return {
          ...choiceRest,
          message: {
            content,
            function_call: { arguments: args, name },
            role,
            refusal: message.refusal ?? null
          },
          finish_reason,
          index,
          logprobs
        };
      }
      if (tool_calls) {
        return {
          ...choiceRest,
          index,
          finish_reason,
          logprobs,
          message: {
            ...messageRest,
            role,
            content,
            refusal: message.refusal ?? null,
            tool_calls: tool_calls.map((tool_call, i) => {
              const { function: fn, type, id: id2, ...toolRest } = tool_call;
              const { arguments: args, name, ...fnRest } = fn || {};
              if (id2 == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].id
${str(snapshot)}`);
              }
              if (type == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].type
${str(snapshot)}`);
              }
              if (name == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.name
${str(snapshot)}`);
              }
              if (args == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.arguments
${str(snapshot)}`);
              }
              return { ...toolRest, id: id2, type, function: { ...fnRest, name, arguments: args } };
            })
          }
        };
      }
      return {
        ...choiceRest,
        message: { ...messageRest, content, role, refusal: message.refusal ?? null },
        finish_reason,
        index,
        logprobs
      };
    }),
    created,
    model,
    object: "chat.completion",
    ...system_fingerprint ? { system_fingerprint } : {}
  };
  return maybeParseChatCompletion(completion, params);
}
__name(finalizeChatCompletion, "finalizeChatCompletion");
function str(x) {
  return JSON.stringify(x);
}
__name(str, "str");
function assertIsEmpty(obj) {
  return;
}
__name(assertIsEmpty, "assertIsEmpty");
function assertNever(_x) {
}
__name(assertNever, "assertNever");

// node_modules/openai/lib/ChatCompletionStreamingRunner.mjs
var ChatCompletionStreamingRunner = class _ChatCompletionStreamingRunner extends ChatCompletionStream {
  static {
    __name(this, "ChatCompletionStreamingRunner");
  }
  static fromReadableStream(stream) {
    const runner = new _ChatCompletionStreamingRunner(null);
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static runTools(client, params, options) {
    const runner = new _ChatCompletionStreamingRunner(
      // @ts-expect-error TODO these types are incompatible
      params
    );
    const opts = {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "runTools" }
    };
    runner._run(() => runner._runTools(client, params, opts));
    return runner;
  }
};

// node_modules/openai/resources/chat/completions/completions.mjs
var Completions = class extends APIResource2 {
  static {
    __name(this, "Completions");
  }
  constructor() {
    super(...arguments);
    this.messages = new Messages(this._client);
  }
  create(body, options) {
    return this._client.post("/chat/completions", { body, ...options, stream: body.stream ?? false });
  }
  /**
   * Get a stored chat completion. Only Chat Completions that have been created with
   * the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * const chatCompletion =
   *   await client.chat.completions.retrieve('completion_id');
   * ```
   */
  retrieve(completionID, options) {
    return this._client.get(path3`/chat/completions/${completionID}`, options);
  }
  /**
   * Modify a stored chat completion. Only Chat Completions that have been created
   * with the `store` parameter set to `true` can be modified. Currently, the only
   * supported modification is to update the `metadata` field.
   *
   * @example
   * ```ts
   * const chatCompletion = await client.chat.completions.update(
   *   'completion_id',
   *   { metadata: { foo: 'string' } },
   * );
   * ```
   */
  update(completionID, body, options) {
    return this._client.post(path3`/chat/completions/${completionID}`, { body, ...options });
  }
  /**
   * List stored Chat Completions. Only Chat Completions that have been stored with
   * the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatCompletion of client.chat.completions.list()) {
   *   // ...
   * }
   * ```
   */
  list(query = {}, options) {
    return this._client.getAPIList("/chat/completions", CursorPage, { query, ...options });
  }
  /**
   * Delete a stored chat completion. Only Chat Completions that have been created
   * with the `store` parameter set to `true` can be deleted.
   *
   * @example
   * ```ts
   * const chatCompletionDeleted =
   *   await client.chat.completions.delete('completion_id');
   * ```
   */
  delete(completionID, options) {
    return this._client.delete(path3`/chat/completions/${completionID}`, options);
  }
  parse(body, options) {
    validateInputTools(body.tools);
    return this._client.chat.completions.create(body, {
      ...options,
      headers: {
        ...options?.headers,
        "X-Stainless-Helper-Method": "chat.completions.parse"
      }
    })._thenUnwrap((completion) => parseChatCompletion(completion, body));
  }
  runTools(body, options) {
    if (body.stream) {
      return ChatCompletionStreamingRunner.runTools(this._client, body, options);
    }
    return ChatCompletionRunner.runTools(this._client, body, options);
  }
  /**
   * Creates a chat completion stream
   */
  stream(body, options) {
    return ChatCompletionStream.createChatCompletion(this._client, body, options);
  }
};
Completions.Messages = Messages;

// node_modules/openai/resources/chat/chat.mjs
var Chat = class extends APIResource2 {
  static {
    __name(this, "Chat");
  }
  constructor() {
    super(...arguments);
    this.completions = new Completions(this._client);
  }
};
Chat.Completions = Completions;

// node_modules/openai/resources/chat/completions/index.mjs
init_esm();

// node_modules/openai/resources/shared.mjs
init_esm();

// node_modules/openai/resources/audio/audio.mjs
init_esm();

// node_modules/openai/resources/audio/speech.mjs
init_esm();

// node_modules/openai/internal/headers.mjs
init_esm();
var brand_privateNullableHeaders2 = /* @__PURE__ */ Symbol("brand.privateNullableHeaders");
function* iterateHeaders2(headers) {
  if (!headers)
    return;
  if (brand_privateNullableHeaders2 in headers) {
    const { values, nulls } = headers;
    yield* values.entries();
    for (const name of nulls) {
      yield [name, null];
    }
    return;
  }
  let shouldClear = false;
  let iter;
  if (headers instanceof Headers) {
    iter = headers.entries();
  } else if (isReadonlyArray2(headers)) {
    iter = headers;
  } else {
    shouldClear = true;
    iter = Object.entries(headers ?? {});
  }
  for (let row of iter) {
    const name = row[0];
    if (typeof name !== "string")
      throw new TypeError("expected header name to be a string");
    const values = isReadonlyArray2(row[1]) ? row[1] : [row[1]];
    let didClear = false;
    for (const value of values) {
      if (value === void 0)
        continue;
      if (shouldClear && !didClear) {
        didClear = true;
        yield [name, null];
      }
      yield [name, value];
    }
  }
}
__name(iterateHeaders2, "iterateHeaders");
var buildHeaders2 = /* @__PURE__ */ __name((newHeaders) => {
  const targetHeaders = new Headers();
  const nullHeaders = /* @__PURE__ */ new Set();
  for (const headers of newHeaders) {
    const seenHeaders = /* @__PURE__ */ new Set();
    for (const [name, value] of iterateHeaders2(headers)) {
      const lowerName = name.toLowerCase();
      if (!seenHeaders.has(lowerName)) {
        targetHeaders.delete(name);
        seenHeaders.add(lowerName);
      }
      if (value === null) {
        targetHeaders.delete(name);
        nullHeaders.add(lowerName);
      } else {
        targetHeaders.append(name, value);
        nullHeaders.delete(lowerName);
      }
    }
  }
  return { [brand_privateNullableHeaders2]: true, values: targetHeaders, nulls: nullHeaders };
}, "buildHeaders");

// node_modules/openai/resources/audio/speech.mjs
var Speech = class extends APIResource2 {
  static {
    __name(this, "Speech");
  }
  /**
   * Generates audio from the input text.
   *
   * Returns the audio file content, or a stream of audio events.
   *
   * @example
   * ```ts
   * const speech = await client.audio.speech.create({
   *   input: 'input',
   *   model: 'string',
   *   voice: 'ash',
   * });
   *
   * const content = await speech.blob();
   * console.log(content);
   * ```
   */
  create(body, options) {
    return this._client.post("/audio/speech", {
      body,
      ...options,
      headers: buildHeaders2([{ Accept: "application/octet-stream" }, options?.headers]),
      __binaryResponse: true
    });
  }
};

// node_modules/openai/resources/audio/transcriptions.mjs
init_esm();
var Transcriptions = class extends APIResource2 {
  static {
    __name(this, "Transcriptions");
  }
  create(body, options) {
    return this._client.post("/audio/transcriptions", multipartFormRequestOptions({
      body,
      ...options,
      stream: body.stream ?? false,
      __metadata: { model: body.model }
    }, this._client));
  }
};

// node_modules/openai/resources/audio/translations.mjs
init_esm();
var Translations = class extends APIResource2 {
  static {
    __name(this, "Translations");
  }
  create(body, options) {
    return this._client.post("/audio/translations", multipartFormRequestOptions({ body, ...options, __metadata: { model: body.model } }, this._client));
  }
};

// node_modules/openai/resources/audio/audio.mjs
var Audio = class extends APIResource2 {
  static {
    __name(this, "Audio");
  }
  constructor() {
    super(...arguments);
    this.transcriptions = new Transcriptions(this._client);
    this.translations = new Translations(this._client);
    this.speech = new Speech(this._client);
  }
};
Audio.Transcriptions = Transcriptions;
Audio.Translations = Translations;
Audio.Speech = Speech;

// node_modules/openai/resources/batches.mjs
init_esm();
var Batches = class extends APIResource2 {
  static {
    __name(this, "Batches");
  }
  /**
   * Creates and executes a batch from an uploaded file of requests
   */
  create(body, options) {
    return this._client.post("/batches", { body, ...options });
  }
  /**
   * Retrieves a batch.
   */
  retrieve(batchID, options) {
    return this._client.get(path3`/batches/${batchID}`, options);
  }
  /**
   * List your organization's batches.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/batches", CursorPage, { query, ...options });
  }
  /**
   * Cancels an in-progress batch. The batch will be in status `cancelling` for up to
   * 10 minutes, before changing to `cancelled`, where it will have partial results
   * (if any) available in the output file.
   */
  cancel(batchID, options) {
    return this._client.post(path3`/batches/${batchID}/cancel`, options);
  }
};

// node_modules/openai/resources/beta/beta.mjs
init_esm();

// node_modules/openai/resources/beta/assistants.mjs
init_esm();
var Assistants = class extends APIResource2 {
  static {
    __name(this, "Assistants");
  }
  /**
   * Create an assistant with a model and instructions.
   *
   * @deprecated
   */
  create(body, options) {
    return this._client.post("/assistants", {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves an assistant.
   *
   * @deprecated
   */
  retrieve(assistantID, options) {
    return this._client.get(path3`/assistants/${assistantID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies an assistant.
   *
   * @deprecated
   */
  update(assistantID, body, options) {
    return this._client.post(path3`/assistants/${assistantID}`, {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of assistants.
   *
   * @deprecated
   */
  list(query = {}, options) {
    return this._client.getAPIList("/assistants", CursorPage, {
      query,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete an assistant.
   *
   * @deprecated
   */
  delete(assistantID, options) {
    return this._client.delete(path3`/assistants/${assistantID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/realtime/realtime.mjs
init_esm();

// node_modules/openai/resources/beta/realtime/sessions.mjs
init_esm();
var Sessions = class extends APIResource2 {
  static {
    __name(this, "Sessions");
  }
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API. Can be configured with the same session parameters as the
   * `session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains a
   * usable ephemeral API token that can be used to authenticate browser clients for
   * the Realtime API.
   *
   * @example
   * ```ts
   * const session =
   *   await client.beta.realtime.sessions.create();
   * ```
   */
  create(body, options) {
    return this._client.post("/realtime/sessions", {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/realtime/transcription-sessions.mjs
init_esm();
var TranscriptionSessions = class extends APIResource2 {
  static {
    __name(this, "TranscriptionSessions");
  }
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API specifically for realtime transcriptions. Can be configured with
   * the same session parameters as the `transcription_session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains a
   * usable ephemeral API token that can be used to authenticate browser clients for
   * the Realtime API.
   *
   * @example
   * ```ts
   * const transcriptionSession =
   *   await client.beta.realtime.transcriptionSessions.create();
   * ```
   */
  create(body, options) {
    return this._client.post("/realtime/transcription_sessions", {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/realtime/realtime.mjs
var Realtime2 = class extends APIResource2 {
  static {
    __name(this, "Realtime");
  }
  constructor() {
    super(...arguments);
    this.sessions = new Sessions(this._client);
    this.transcriptionSessions = new TranscriptionSessions(this._client);
  }
};
Realtime2.Sessions = Sessions;
Realtime2.TranscriptionSessions = TranscriptionSessions;

// node_modules/openai/resources/beta/chatkit/chatkit.mjs
init_esm();

// node_modules/openai/resources/beta/chatkit/sessions.mjs
init_esm();
var Sessions2 = class extends APIResource2 {
  static {
    __name(this, "Sessions");
  }
  /**
   * Create a ChatKit session.
   *
   * @example
   * ```ts
   * const chatSession =
   *   await client.beta.chatkit.sessions.create({
   *     user: 'x',
   *     workflow: { id: 'id' },
   *   });
   * ```
   */
  create(body, options) {
    return this._client.post("/chatkit/sessions", {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
    });
  }
  /**
   * Cancel an active ChatKit session and return its most recent metadata.
   *
   * Cancelling prevents new requests from using the issued client secret.
   *
   * @example
   * ```ts
   * const chatSession =
   *   await client.beta.chatkit.sessions.cancel('cksess_123');
   * ```
   */
  cancel(sessionID, options) {
    return this._client.post(path3`/chatkit/sessions/${sessionID}/cancel`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/chatkit/threads.mjs
init_esm();
var Threads = class extends APIResource2 {
  static {
    __name(this, "Threads");
  }
  /**
   * Retrieve a ChatKit thread by its identifier.
   *
   * @example
   * ```ts
   * const chatkitThread =
   *   await client.beta.chatkit.threads.retrieve('cthr_123');
   * ```
   */
  retrieve(threadID, options) {
    return this._client.get(path3`/chatkit/threads/${threadID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
    });
  }
  /**
   * List ChatKit threads with optional pagination and user filters.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatkitThread of client.beta.chatkit.threads.list()) {
   *   // ...
   * }
   * ```
   */
  list(query = {}, options) {
    return this._client.getAPIList("/chatkit/threads", ConversationCursorPage, {
      query,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
    });
  }
  /**
   * Delete a ChatKit thread along with its items and stored attachments.
   *
   * @example
   * ```ts
   * const thread = await client.beta.chatkit.threads.delete(
   *   'cthr_123',
   * );
   * ```
   */
  delete(threadID, options) {
    return this._client.delete(path3`/chatkit/threads/${threadID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
    });
  }
  /**
   * List items that belong to a ChatKit thread.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const thread of client.beta.chatkit.threads.listItems(
   *   'cthr_123',
   * )) {
   *   // ...
   * }
   * ```
   */
  listItems(threadID, query = {}, options) {
    return this._client.getAPIList(path3`/chatkit/threads/${threadID}/items`, ConversationCursorPage, { query, ...options, headers: buildHeaders2([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers]) });
  }
};

// node_modules/openai/resources/beta/chatkit/chatkit.mjs
var ChatKit = class extends APIResource2 {
  static {
    __name(this, "ChatKit");
  }
  constructor() {
    super(...arguments);
    this.sessions = new Sessions2(this._client);
    this.threads = new Threads(this._client);
  }
};
ChatKit.Sessions = Sessions2;
ChatKit.Threads = Threads;

// node_modules/openai/resources/beta/threads/threads.mjs
init_esm();

// node_modules/openai/resources/beta/threads/messages.mjs
init_esm();
var Messages2 = class extends APIResource2 {
  static {
    __name(this, "Messages");
  }
  /**
   * Create a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  create(threadID, body, options) {
    return this._client.post(path3`/threads/${threadID}/messages`, {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieve a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(messageID, params, options) {
    const { thread_id } = params;
    return this._client.get(path3`/threads/${thread_id}/messages/${messageID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(messageID, params, options) {
    const { thread_id, ...body } = params;
    return this._client.post(path3`/threads/${thread_id}/messages/${messageID}`, {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of messages for a given thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(threadID, query = {}, options) {
    return this._client.getAPIList(path3`/threads/${threadID}/messages`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Deletes a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  delete(messageID, params, options) {
    const { thread_id } = params;
    return this._client.delete(path3`/threads/${thread_id}/messages/${messageID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/threads/runs/runs.mjs
init_esm();

// node_modules/openai/resources/beta/threads/runs/steps.mjs
init_esm();
var Steps = class extends APIResource2 {
  static {
    __name(this, "Steps");
  }
  /**
   * Retrieves a run step.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(stepID, params, options) {
    const { thread_id, run_id, ...query } = params;
    return this._client.get(path3`/threads/${thread_id}/runs/${run_id}/steps/${stepID}`, {
      query,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of run steps belonging to a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(runID, params, options) {
    const { thread_id, ...query } = params;
    return this._client.getAPIList(path3`/threads/${thread_id}/runs/${runID}/steps`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/lib/AssistantStream.mjs
init_esm();

// node_modules/openai/internal/utils.mjs
init_esm();

// node_modules/openai/internal/utils/base64.mjs
init_esm();
var toFloat32Array = /* @__PURE__ */ __name((base64Str) => {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64Str, "base64");
    return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.length / Float32Array.BYTES_PER_ELEMENT));
  } else {
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return Array.from(new Float32Array(bytes.buffer));
  }
}, "toFloat32Array");

// node_modules/openai/internal/utils/env.mjs
init_esm();
var readEnv2 = /* @__PURE__ */ __name((env) => {
  if (typeof globalThis.process !== "undefined") {
    return globalThis.process.env?.[env]?.trim() ?? void 0;
  }
  if (typeof globalThis.Deno !== "undefined") {
    return globalThis.Deno.env?.get?.(env)?.trim();
  }
  return void 0;
}, "readEnv");

// node_modules/openai/lib/AssistantStream.mjs
var _AssistantStream_instances;
var _a2;
var _AssistantStream_events;
var _AssistantStream_runStepSnapshots;
var _AssistantStream_messageSnapshots;
var _AssistantStream_messageSnapshot;
var _AssistantStream_finalRun;
var _AssistantStream_currentContentIndex;
var _AssistantStream_currentContent;
var _AssistantStream_currentToolCallIndex;
var _AssistantStream_currentToolCall;
var _AssistantStream_currentEvent;
var _AssistantStream_currentRunSnapshot;
var _AssistantStream_currentRunStepSnapshot;
var _AssistantStream_addEvent;
var _AssistantStream_endRequest;
var _AssistantStream_handleMessage;
var _AssistantStream_handleRunStep;
var _AssistantStream_handleEvent;
var _AssistantStream_accumulateRunStep;
var _AssistantStream_accumulateMessage;
var _AssistantStream_accumulateContent;
var _AssistantStream_handleRun;
var AssistantStream = class extends EventStream {
  static {
    __name(this, "AssistantStream");
  }
  constructor() {
    super(...arguments);
    _AssistantStream_instances.add(this);
    _AssistantStream_events.set(this, []);
    _AssistantStream_runStepSnapshots.set(this, {});
    _AssistantStream_messageSnapshots.set(this, {});
    _AssistantStream_messageSnapshot.set(this, void 0);
    _AssistantStream_finalRun.set(this, void 0);
    _AssistantStream_currentContentIndex.set(this, void 0);
    _AssistantStream_currentContent.set(this, void 0);
    _AssistantStream_currentToolCallIndex.set(this, void 0);
    _AssistantStream_currentToolCall.set(this, void 0);
    _AssistantStream_currentEvent.set(this, void 0);
    _AssistantStream_currentRunSnapshot.set(this, void 0);
    _AssistantStream_currentRunStepSnapshot.set(this, void 0);
  }
  [(_AssistantStream_events = /* @__PURE__ */ new WeakMap(), _AssistantStream_runStepSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_finalRun = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContentIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCallIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCall = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentEvent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunStepSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_instances = /* @__PURE__ */ new WeakSet(), Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("event", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: /* @__PURE__ */ __name(async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      }, "next"),
      return: /* @__PURE__ */ __name(async () => {
        this.abort();
        return { value: void 0, done: true };
      }, "return")
    };
  }
  static fromReadableStream(stream) {
    const runner = new _a2();
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    this._connected();
    const stream = Stream.fromReadableStream(readableStream, this.controller);
    for await (const event of stream) {
      __classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError2();
    }
    return this._addRun(__classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
  static createToolAssistantStream(runId, runs, params, options) {
    const runner = new _a2();
    runner._run(() => runner._runToolAssistantStream(runId, runs, params, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  async _createToolAssistantStream(run, runId, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await run.submitToolOutputs(runId, body, {
      ...options,
      signal: this.controller.signal
    });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError2();
    }
    return this._addRun(__classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  static createThreadAssistantStream(params, thread, options) {
    const runner = new _a2();
    runner._run(() => runner._threadAssistantStream(params, thread, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  static createAssistantStream(threadId, runs, params, options) {
    const runner = new _a2();
    runner._run(() => runner._runAssistantStream(threadId, runs, params, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  currentEvent() {
    return __classPrivateFieldGet2(this, _AssistantStream_currentEvent, "f");
  }
  currentRun() {
    return __classPrivateFieldGet2(this, _AssistantStream_currentRunSnapshot, "f");
  }
  currentMessageSnapshot() {
    return __classPrivateFieldGet2(this, _AssistantStream_messageSnapshot, "f");
  }
  currentRunStepSnapshot() {
    return __classPrivateFieldGet2(this, _AssistantStream_currentRunStepSnapshot, "f");
  }
  async finalRunSteps() {
    await this.done();
    return Object.values(__classPrivateFieldGet2(this, _AssistantStream_runStepSnapshots, "f"));
  }
  async finalMessages() {
    await this.done();
    return Object.values(__classPrivateFieldGet2(this, _AssistantStream_messageSnapshots, "f"));
  }
  async finalRun() {
    await this.done();
    if (!__classPrivateFieldGet2(this, _AssistantStream_finalRun, "f"))
      throw Error("Final run was not received.");
    return __classPrivateFieldGet2(this, _AssistantStream_finalRun, "f");
  }
  async _createThreadAssistantStream(thread, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await thread.createAndRun(body, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError2();
    }
    return this._addRun(__classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  async _createAssistantStream(run, threadId, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await run.create(threadId, body, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError2();
    }
    return this._addRun(__classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  static accumulateDelta(acc, delta) {
    for (const [key, deltaValue] of Object.entries(delta)) {
      if (!acc.hasOwnProperty(key)) {
        acc[key] = deltaValue;
        continue;
      }
      let accValue = acc[key];
      if (accValue === null || accValue === void 0) {
        acc[key] = deltaValue;
        continue;
      }
      if (key === "index" || key === "type") {
        acc[key] = deltaValue;
        continue;
      }
      if (typeof accValue === "string" && typeof deltaValue === "string") {
        accValue += deltaValue;
      } else if (typeof accValue === "number" && typeof deltaValue === "number") {
        accValue += deltaValue;
      } else if (isObj(accValue) && isObj(deltaValue)) {
        accValue = this.accumulateDelta(accValue, deltaValue);
      } else if (Array.isArray(accValue) && Array.isArray(deltaValue)) {
        if (accValue.every((x) => typeof x === "string" || typeof x === "number")) {
          accValue.push(...deltaValue);
          continue;
        }
        for (const deltaEntry of deltaValue) {
          if (!isObj(deltaEntry)) {
            throw new Error(`Expected array delta entry to be an object but got: ${deltaEntry}`);
          }
          const index = deltaEntry["index"];
          if (index == null) {
            console.error(deltaEntry);
            throw new Error("Expected array delta entry to have an `index` property");
          }
          if (typeof index !== "number") {
            throw new Error(`Expected array delta entry \`index\` property to be a number but got ${index}`);
          }
          const accEntry = accValue[index];
          if (accEntry == null) {
            accValue.push(deltaEntry);
          } else {
            accValue[index] = this.accumulateDelta(accEntry, deltaEntry);
          }
        }
        continue;
      } else {
        throw Error(`Unhandled record type: ${key}, deltaValue: ${deltaValue}, accValue: ${accValue}`);
      }
      acc[key] = accValue;
    }
    return acc;
  }
  _addRun(run) {
    return run;
  }
  async _threadAssistantStream(params, thread, options) {
    return await this._createThreadAssistantStream(thread, params, options);
  }
  async _runAssistantStream(threadId, runs, params, options) {
    return await this._createAssistantStream(runs, threadId, params, options);
  }
  async _runToolAssistantStream(runId, runs, params, options) {
    return await this._createToolAssistantStream(runs, runId, params, options);
  }
};
_a2 = AssistantStream, _AssistantStream_addEvent = /* @__PURE__ */ __name(function _AssistantStream_addEvent2(event) {
  if (this.ended)
    return;
  __classPrivateFieldSet2(this, _AssistantStream_currentEvent, event, "f");
  __classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_handleEvent).call(this, event);
  switch (event.event) {
    case "thread.created":
      break;
    case "thread.run.created":
    case "thread.run.queued":
    case "thread.run.in_progress":
    case "thread.run.requires_action":
    case "thread.run.completed":
    case "thread.run.incomplete":
    case "thread.run.failed":
    case "thread.run.cancelling":
    case "thread.run.cancelled":
    case "thread.run.expired":
      __classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_handleRun).call(this, event);
      break;
    case "thread.run.step.created":
    case "thread.run.step.in_progress":
    case "thread.run.step.delta":
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
      __classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_handleRunStep).call(this, event);
      break;
    case "thread.message.created":
    case "thread.message.in_progress":
    case "thread.message.delta":
    case "thread.message.completed":
    case "thread.message.incomplete":
      __classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_handleMessage).call(this, event);
      break;
    case "error":
      throw new Error("Encountered an error event in event processing - errors should be processed earlier");
    default:
      assertNever2(event);
  }
}, "_AssistantStream_addEvent"), _AssistantStream_endRequest = /* @__PURE__ */ __name(function _AssistantStream_endRequest2() {
  if (this.ended) {
    throw new OpenAIError(`stream has ended, this shouldn't happen`);
  }
  if (!__classPrivateFieldGet2(this, _AssistantStream_finalRun, "f"))
    throw Error("Final run has not been received");
  return __classPrivateFieldGet2(this, _AssistantStream_finalRun, "f");
}, "_AssistantStream_endRequest"), _AssistantStream_handleMessage = /* @__PURE__ */ __name(function _AssistantStream_handleMessage2(event) {
  const [accumulatedMessage, newContent] = __classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_accumulateMessage).call(this, event, __classPrivateFieldGet2(this, _AssistantStream_messageSnapshot, "f"));
  __classPrivateFieldSet2(this, _AssistantStream_messageSnapshot, accumulatedMessage, "f");
  __classPrivateFieldGet2(this, _AssistantStream_messageSnapshots, "f")[accumulatedMessage.id] = accumulatedMessage;
  for (const content of newContent) {
    const snapshotContent = accumulatedMessage.content[content.index];
    if (snapshotContent?.type == "text") {
      this._emit("textCreated", snapshotContent.text);
    }
  }
  switch (event.event) {
    case "thread.message.created":
      this._emit("messageCreated", event.data);
      break;
    case "thread.message.in_progress":
      break;
    case "thread.message.delta":
      this._emit("messageDelta", event.data.delta, accumulatedMessage);
      if (event.data.delta.content) {
        for (const content of event.data.delta.content) {
          if (content.type == "text" && content.text) {
            let textDelta = content.text;
            let snapshot = accumulatedMessage.content[content.index];
            if (snapshot && snapshot.type == "text") {
              this._emit("textDelta", textDelta, snapshot.text);
            } else {
              throw Error("The snapshot associated with this text delta is not text or missing");
            }
          }
          if (content.index != __classPrivateFieldGet2(this, _AssistantStream_currentContentIndex, "f")) {
            if (__classPrivateFieldGet2(this, _AssistantStream_currentContent, "f")) {
              switch (__classPrivateFieldGet2(this, _AssistantStream_currentContent, "f").type) {
                case "text":
                  this._emit("textDone", __classPrivateFieldGet2(this, _AssistantStream_currentContent, "f").text, __classPrivateFieldGet2(this, _AssistantStream_messageSnapshot, "f"));
                  break;
                case "image_file":
                  this._emit("imageFileDone", __classPrivateFieldGet2(this, _AssistantStream_currentContent, "f").image_file, __classPrivateFieldGet2(this, _AssistantStream_messageSnapshot, "f"));
                  break;
              }
            }
            __classPrivateFieldSet2(this, _AssistantStream_currentContentIndex, content.index, "f");
          }
          __classPrivateFieldSet2(this, _AssistantStream_currentContent, accumulatedMessage.content[content.index], "f");
        }
      }
      break;
    case "thread.message.completed":
    case "thread.message.incomplete":
      if (__classPrivateFieldGet2(this, _AssistantStream_currentContentIndex, "f") !== void 0) {
        const currentContent = event.data.content[__classPrivateFieldGet2(this, _AssistantStream_currentContentIndex, "f")];
        if (currentContent) {
          switch (currentContent.type) {
            case "image_file":
              this._emit("imageFileDone", currentContent.image_file, __classPrivateFieldGet2(this, _AssistantStream_messageSnapshot, "f"));
              break;
            case "text":
              this._emit("textDone", currentContent.text, __classPrivateFieldGet2(this, _AssistantStream_messageSnapshot, "f"));
              break;
          }
        }
      }
      if (__classPrivateFieldGet2(this, _AssistantStream_messageSnapshot, "f")) {
        this._emit("messageDone", event.data);
      }
      __classPrivateFieldSet2(this, _AssistantStream_messageSnapshot, void 0, "f");
  }
}, "_AssistantStream_handleMessage"), _AssistantStream_handleRunStep = /* @__PURE__ */ __name(function _AssistantStream_handleRunStep2(event) {
  const accumulatedRunStep = __classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_accumulateRunStep).call(this, event);
  __classPrivateFieldSet2(this, _AssistantStream_currentRunStepSnapshot, accumulatedRunStep, "f");
  switch (event.event) {
    case "thread.run.step.created":
      this._emit("runStepCreated", event.data);
      break;
    case "thread.run.step.delta":
      const delta = event.data.delta;
      if (delta.step_details && delta.step_details.type == "tool_calls" && delta.step_details.tool_calls && accumulatedRunStep.step_details.type == "tool_calls") {
        for (const toolCall of delta.step_details.tool_calls) {
          if (toolCall.index == __classPrivateFieldGet2(this, _AssistantStream_currentToolCallIndex, "f")) {
            this._emit("toolCallDelta", toolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index]);
          } else {
            if (__classPrivateFieldGet2(this, _AssistantStream_currentToolCall, "f")) {
              this._emit("toolCallDone", __classPrivateFieldGet2(this, _AssistantStream_currentToolCall, "f"));
            }
            __classPrivateFieldSet2(this, _AssistantStream_currentToolCallIndex, toolCall.index, "f");
            __classPrivateFieldSet2(this, _AssistantStream_currentToolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index], "f");
            if (__classPrivateFieldGet2(this, _AssistantStream_currentToolCall, "f"))
              this._emit("toolCallCreated", __classPrivateFieldGet2(this, _AssistantStream_currentToolCall, "f"));
          }
        }
      }
      this._emit("runStepDelta", event.data.delta, accumulatedRunStep);
      break;
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
      __classPrivateFieldSet2(this, _AssistantStream_currentRunStepSnapshot, void 0, "f");
      const details = event.data.step_details;
      if (details.type == "tool_calls") {
        if (__classPrivateFieldGet2(this, _AssistantStream_currentToolCall, "f")) {
          this._emit("toolCallDone", __classPrivateFieldGet2(this, _AssistantStream_currentToolCall, "f"));
          __classPrivateFieldSet2(this, _AssistantStream_currentToolCall, void 0, "f");
        }
      }
      this._emit("runStepDone", event.data, accumulatedRunStep);
      break;
    case "thread.run.step.in_progress":
      break;
  }
}, "_AssistantStream_handleRunStep"), _AssistantStream_handleEvent = /* @__PURE__ */ __name(function _AssistantStream_handleEvent2(event) {
  __classPrivateFieldGet2(this, _AssistantStream_events, "f").push(event);
  this._emit("event", event);
}, "_AssistantStream_handleEvent"), _AssistantStream_accumulateRunStep = /* @__PURE__ */ __name(function _AssistantStream_accumulateRunStep2(event) {
  switch (event.event) {
    case "thread.run.step.created":
      __classPrivateFieldGet2(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
      return event.data;
    case "thread.run.step.delta":
      let snapshot = __classPrivateFieldGet2(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
      if (!snapshot) {
        throw Error("Received a RunStepDelta before creation of a snapshot");
      }
      let data = event.data;
      if (data.delta) {
        const accumulated = _a2.accumulateDelta(snapshot, data.delta);
        __classPrivateFieldGet2(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = accumulated;
      }
      return __classPrivateFieldGet2(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
    case "thread.run.step.in_progress":
      __classPrivateFieldGet2(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
      break;
  }
  if (__classPrivateFieldGet2(this, _AssistantStream_runStepSnapshots, "f")[event.data.id])
    return __classPrivateFieldGet2(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
  throw new Error("No snapshot available");
}, "_AssistantStream_accumulateRunStep"), _AssistantStream_accumulateMessage = /* @__PURE__ */ __name(function _AssistantStream_accumulateMessage2(event, snapshot) {
  let newContent = [];
  switch (event.event) {
    case "thread.message.created":
      return [event.data, newContent];
    case "thread.message.delta":
      if (!snapshot) {
        throw Error("Received a delta with no existing snapshot (there should be one from message creation)");
      }
      let data = event.data;
      if (data.delta.content) {
        for (const contentElement of data.delta.content) {
          if (contentElement.index in snapshot.content) {
            let currentContent = snapshot.content[contentElement.index];
            snapshot.content[contentElement.index] = __classPrivateFieldGet2(this, _AssistantStream_instances, "m", _AssistantStream_accumulateContent).call(this, contentElement, currentContent);
          } else {
            snapshot.content[contentElement.index] = contentElement;
            newContent.push(contentElement);
          }
        }
      }
      return [snapshot, newContent];
    case "thread.message.in_progress":
    case "thread.message.completed":
    case "thread.message.incomplete":
      if (snapshot) {
        return [snapshot, newContent];
      } else {
        throw Error("Received thread message event with no existing snapshot");
      }
  }
  throw Error("Tried to accumulate a non-message event");
}, "_AssistantStream_accumulateMessage"), _AssistantStream_accumulateContent = /* @__PURE__ */ __name(function _AssistantStream_accumulateContent2(contentElement, currentContent) {
  return _a2.accumulateDelta(currentContent, contentElement);
}, "_AssistantStream_accumulateContent"), _AssistantStream_handleRun = /* @__PURE__ */ __name(function _AssistantStream_handleRun2(event) {
  __classPrivateFieldSet2(this, _AssistantStream_currentRunSnapshot, event.data, "f");
  switch (event.event) {
    case "thread.run.created":
      break;
    case "thread.run.queued":
      break;
    case "thread.run.in_progress":
      break;
    case "thread.run.requires_action":
    case "thread.run.cancelled":
    case "thread.run.failed":
    case "thread.run.completed":
    case "thread.run.expired":
    case "thread.run.incomplete":
      __classPrivateFieldSet2(this, _AssistantStream_finalRun, event.data, "f");
      if (__classPrivateFieldGet2(this, _AssistantStream_currentToolCall, "f")) {
        this._emit("toolCallDone", __classPrivateFieldGet2(this, _AssistantStream_currentToolCall, "f"));
        __classPrivateFieldSet2(this, _AssistantStream_currentToolCall, void 0, "f");
      }
      break;
    case "thread.run.cancelling":
      break;
  }
}, "_AssistantStream_handleRun");
function assertNever2(_x) {
}
__name(assertNever2, "assertNever");

// node_modules/openai/resources/beta/threads/runs/runs.mjs
var Runs = class extends APIResource2 {
  static {
    __name(this, "Runs");
  }
  constructor() {
    super(...arguments);
    this.steps = new Steps(this._client);
  }
  create(threadID, params, options) {
    const { include, ...body } = params;
    return this._client.post(path3`/threads/${threadID}/runs`, {
      query: { include },
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
      stream: params.stream ?? false,
      __synthesizeEventData: true
    });
  }
  /**
   * Retrieves a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(runID, params, options) {
    const { thread_id } = params;
    return this._client.get(path3`/threads/${thread_id}/runs/${runID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(runID, params, options) {
    const { thread_id, ...body } = params;
    return this._client.post(path3`/threads/${thread_id}/runs/${runID}`, {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of runs belonging to a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(threadID, query = {}, options) {
    return this._client.getAPIList(path3`/threads/${threadID}/runs`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Cancels a run that is `in_progress`.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  cancel(runID, params, options) {
    const { thread_id } = params;
    return this._client.post(path3`/threads/${thread_id}/runs/${runID}/cancel`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * A helper to create a run an poll for a terminal state. More information on Run
   * lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async createAndPoll(threadId, body, options) {
    const run = await this.create(threadId, body, options);
    return await this.poll(run.id, { thread_id: threadId }, options);
  }
  /**
   * Create a Run stream
   *
   * @deprecated use `stream` instead
   */
  createAndStream(threadId, body, options) {
    return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
  }
  /**
   * A helper to poll a run status until it reaches a terminal state. More
   * information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async poll(runId, params, options) {
    const headers = buildHeaders2([
      options?.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
      }
    ]);
    while (true) {
      const { data: run, response } = await this.retrieve(runId, params, {
        ...options,
        headers: { ...options?.headers, ...headers }
      }).withResponse();
      switch (run.status) {
        //If we are in any sort of intermediate state we poll
        case "queued":
        case "in_progress":
        case "cancelling":
          let sleepInterval = 5e3;
          if (options?.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep2(sleepInterval);
          break;
        //We return the run in any terminal state.
        case "requires_action":
        case "incomplete":
        case "cancelled":
        case "completed":
        case "failed":
        case "expired":
          return run;
      }
    }
  }
  /**
   * Create a Run stream
   */
  stream(threadId, body, options) {
    return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
  }
  submitToolOutputs(runID, params, options) {
    const { thread_id, ...body } = params;
    return this._client.post(path3`/threads/${thread_id}/runs/${runID}/submit_tool_outputs`, {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
      stream: params.stream ?? false,
      __synthesizeEventData: true
    });
  }
  /**
   * A helper to submit a tool output to a run and poll for a terminal run state.
   * More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async submitToolOutputsAndPoll(runId, params, options) {
    const run = await this.submitToolOutputs(runId, params, options);
    return await this.poll(run.id, params, options);
  }
  /**
   * Submit the tool outputs from a previous run and stream the run to a terminal
   * state. More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  submitToolOutputsStream(runId, params, options) {
    return AssistantStream.createToolAssistantStream(runId, this._client.beta.threads.runs, params, options);
  }
};
Runs.Steps = Steps;

// node_modules/openai/resources/beta/threads/threads.mjs
var Threads2 = class extends APIResource2 {
  static {
    __name(this, "Threads");
  }
  constructor() {
    super(...arguments);
    this.runs = new Runs(this._client);
    this.messages = new Messages2(this._client);
  }
  /**
   * Create a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  create(body = {}, options) {
    return this._client.post("/threads", {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(threadID, options) {
    return this._client.get(path3`/threads/${threadID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(threadID, body, options) {
    return this._client.post(path3`/threads/${threadID}`, {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  delete(threadID, options) {
    return this._client.delete(path3`/threads/${threadID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  createAndRun(body, options) {
    return this._client.post("/threads/runs", {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
      stream: body.stream ?? false,
      __synthesizeEventData: true
    });
  }
  /**
   * A helper to create a thread, start a run and then poll for a terminal state.
   * More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async createAndRunPoll(body, options) {
    const run = await this.createAndRun(body, options);
    return await this.runs.poll(run.id, { thread_id: run.thread_id }, options);
  }
  /**
   * Create a thread and stream the run back
   */
  createAndRunStream(body, options) {
    return AssistantStream.createThreadAssistantStream(body, this._client.beta.threads, options);
  }
};
Threads2.Runs = Runs;
Threads2.Messages = Messages2;

// node_modules/openai/resources/beta/beta.mjs
var Beta = class extends APIResource2 {
  static {
    __name(this, "Beta");
  }
  constructor() {
    super(...arguments);
    this.realtime = new Realtime2(this._client);
    this.chatkit = new ChatKit(this._client);
    this.assistants = new Assistants(this._client);
    this.threads = new Threads2(this._client);
  }
};
Beta.Realtime = Realtime2;
Beta.ChatKit = ChatKit;
Beta.Assistants = Assistants;
Beta.Threads = Threads2;

// node_modules/openai/resources/completions.mjs
init_esm();
var Completions2 = class extends APIResource2 {
  static {
    __name(this, "Completions");
  }
  create(body, options) {
    return this._client.post("/completions", { body, ...options, stream: body.stream ?? false });
  }
};

// node_modules/openai/resources/containers/containers.mjs
init_esm();

// node_modules/openai/resources/containers/files/files.mjs
init_esm();

// node_modules/openai/resources/containers/files/content.mjs
init_esm();
var Content = class extends APIResource2 {
  static {
    __name(this, "Content");
  }
  /**
   * Retrieve Container File Content
   */
  retrieve(fileID, params, options) {
    const { container_id } = params;
    return this._client.get(path3`/containers/${container_id}/files/${fileID}/content`, {
      ...options,
      headers: buildHeaders2([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
};

// node_modules/openai/resources/containers/files/files.mjs
var Files2 = class extends APIResource2 {
  static {
    __name(this, "Files");
  }
  constructor() {
    super(...arguments);
    this.content = new Content(this._client);
  }
  /**
   * Create a Container File
   *
   * You can send either a multipart/form-data request with the raw file content, or
   * a JSON request with a file ID.
   */
  create(containerID, body, options) {
    return this._client.post(path3`/containers/${containerID}/files`, maybeMultipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Retrieve Container File
   */
  retrieve(fileID, params, options) {
    const { container_id } = params;
    return this._client.get(path3`/containers/${container_id}/files/${fileID}`, options);
  }
  /**
   * List Container files
   */
  list(containerID, query = {}, options) {
    return this._client.getAPIList(path3`/containers/${containerID}/files`, CursorPage, {
      query,
      ...options
    });
  }
  /**
   * Delete Container File
   */
  delete(fileID, params, options) {
    const { container_id } = params;
    return this._client.delete(path3`/containers/${container_id}/files/${fileID}`, {
      ...options,
      headers: buildHeaders2([{ Accept: "*/*" }, options?.headers])
    });
  }
};
Files2.Content = Content;

// node_modules/openai/resources/containers/containers.mjs
var Containers = class extends APIResource2 {
  static {
    __name(this, "Containers");
  }
  constructor() {
    super(...arguments);
    this.files = new Files2(this._client);
  }
  /**
   * Create Container
   */
  create(body, options) {
    return this._client.post("/containers", { body, ...options });
  }
  /**
   * Retrieve Container
   */
  retrieve(containerID, options) {
    return this._client.get(path3`/containers/${containerID}`, options);
  }
  /**
   * List Containers
   */
  list(query = {}, options) {
    return this._client.getAPIList("/containers", CursorPage, { query, ...options });
  }
  /**
   * Delete Container
   */
  delete(containerID, options) {
    return this._client.delete(path3`/containers/${containerID}`, {
      ...options,
      headers: buildHeaders2([{ Accept: "*/*" }, options?.headers])
    });
  }
};
Containers.Files = Files2;

// node_modules/openai/resources/conversations/conversations.mjs
init_esm();

// node_modules/openai/resources/conversations/items.mjs
init_esm();
var Items = class extends APIResource2 {
  static {
    __name(this, "Items");
  }
  /**
   * Create items in a conversation with the given ID.
   */
  create(conversationID, params, options) {
    const { include, ...body } = params;
    return this._client.post(path3`/conversations/${conversationID}/items`, {
      query: { include },
      body,
      ...options
    });
  }
  /**
   * Get a single item from a conversation with the given IDs.
   */
  retrieve(itemID, params, options) {
    const { conversation_id, ...query } = params;
    return this._client.get(path3`/conversations/${conversation_id}/items/${itemID}`, { query, ...options });
  }
  /**
   * List all items for a conversation with the given ID.
   */
  list(conversationID, query = {}, options) {
    return this._client.getAPIList(path3`/conversations/${conversationID}/items`, ConversationCursorPage, { query, ...options });
  }
  /**
   * Delete an item from a conversation with the given IDs.
   */
  delete(itemID, params, options) {
    const { conversation_id } = params;
    return this._client.delete(path3`/conversations/${conversation_id}/items/${itemID}`, options);
  }
};

// node_modules/openai/resources/conversations/conversations.mjs
var Conversations = class extends APIResource2 {
  static {
    __name(this, "Conversations");
  }
  constructor() {
    super(...arguments);
    this.items = new Items(this._client);
  }
  /**
   * Create a conversation.
   */
  create(body = {}, options) {
    return this._client.post("/conversations", { body, ...options });
  }
  /**
   * Get a conversation
   */
  retrieve(conversationID, options) {
    return this._client.get(path3`/conversations/${conversationID}`, options);
  }
  /**
   * Update a conversation
   */
  update(conversationID, body, options) {
    return this._client.post(path3`/conversations/${conversationID}`, { body, ...options });
  }
  /**
   * Delete a conversation. Items in the conversation will not be deleted.
   */
  delete(conversationID, options) {
    return this._client.delete(path3`/conversations/${conversationID}`, options);
  }
};
Conversations.Items = Items;

// node_modules/openai/resources/embeddings.mjs
init_esm();
var Embeddings = class extends APIResource2 {
  static {
    __name(this, "Embeddings");
  }
  /**
   * Creates an embedding vector representing the input text.
   *
   * @example
   * ```ts
   * const createEmbeddingResponse =
   *   await client.embeddings.create({
   *     input: 'The quick brown fox jumped over the lazy dog',
   *     model: 'text-embedding-3-small',
   *   });
   * ```
   */
  create(body, options) {
    const hasUserProvidedEncodingFormat = !!body.encoding_format;
    let encoding_format = hasUserProvidedEncodingFormat ? body.encoding_format : "base64";
    if (hasUserProvidedEncodingFormat) {
      loggerFor2(this._client).debug("embeddings/user defined encoding_format:", body.encoding_format);
    }
    const response = this._client.post("/embeddings", {
      body: {
        ...body,
        encoding_format
      },
      ...options
    });
    if (hasUserProvidedEncodingFormat) {
      return response;
    }
    loggerFor2(this._client).debug("embeddings/decoding base64 embeddings from base64");
    return response._thenUnwrap((response2) => {
      if (response2 && response2.data) {
        response2.data.forEach((embeddingBase64Obj) => {
          const embeddingBase64Str = embeddingBase64Obj.embedding;
          embeddingBase64Obj.embedding = toFloat32Array(embeddingBase64Str);
        });
      }
      return response2;
    });
  }
};

// node_modules/openai/resources/evals/evals.mjs
init_esm();

// node_modules/openai/resources/evals/runs/runs.mjs
init_esm();

// node_modules/openai/resources/evals/runs/output-items.mjs
init_esm();
var OutputItems = class extends APIResource2 {
  static {
    __name(this, "OutputItems");
  }
  /**
   * Get an evaluation run output item by ID.
   */
  retrieve(outputItemID, params, options) {
    const { eval_id, run_id } = params;
    return this._client.get(path3`/evals/${eval_id}/runs/${run_id}/output_items/${outputItemID}`, options);
  }
  /**
   * Get a list of output items for an evaluation run.
   */
  list(runID, params, options) {
    const { eval_id, ...query } = params;
    return this._client.getAPIList(path3`/evals/${eval_id}/runs/${runID}/output_items`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/resources/evals/runs/runs.mjs
var Runs2 = class extends APIResource2 {
  static {
    __name(this, "Runs");
  }
  constructor() {
    super(...arguments);
    this.outputItems = new OutputItems(this._client);
  }
  /**
   * Kicks off a new run for a given evaluation, specifying the data source, and what
   * model configuration to use to test. The datasource will be validated against the
   * schema specified in the config of the evaluation.
   */
  create(evalID, body, options) {
    return this._client.post(path3`/evals/${evalID}/runs`, { body, ...options });
  }
  /**
   * Get an evaluation run by ID.
   */
  retrieve(runID, params, options) {
    const { eval_id } = params;
    return this._client.get(path3`/evals/${eval_id}/runs/${runID}`, options);
  }
  /**
   * Get a list of runs for an evaluation.
   */
  list(evalID, query = {}, options) {
    return this._client.getAPIList(path3`/evals/${evalID}/runs`, CursorPage, {
      query,
      ...options
    });
  }
  /**
   * Delete an eval run.
   */
  delete(runID, params, options) {
    const { eval_id } = params;
    return this._client.delete(path3`/evals/${eval_id}/runs/${runID}`, options);
  }
  /**
   * Cancel an ongoing evaluation run.
   */
  cancel(runID, params, options) {
    const { eval_id } = params;
    return this._client.post(path3`/evals/${eval_id}/runs/${runID}`, options);
  }
};
Runs2.OutputItems = OutputItems;

// node_modules/openai/resources/evals/evals.mjs
var Evals = class extends APIResource2 {
  static {
    __name(this, "Evals");
  }
  constructor() {
    super(...arguments);
    this.runs = new Runs2(this._client);
  }
  /**
   * Create the structure of an evaluation that can be used to test a model's
   * performance. An evaluation is a set of testing criteria and the config for a
   * data source, which dictates the schema of the data used in the evaluation. After
   * creating an evaluation, you can run it on different models and model parameters.
   * We support several types of graders and datasources. For more information, see
   * the [Evals guide](https://platform.openai.com/docs/guides/evals).
   */
  create(body, options) {
    return this._client.post("/evals", { body, ...options });
  }
  /**
   * Get an evaluation by ID.
   */
  retrieve(evalID, options) {
    return this._client.get(path3`/evals/${evalID}`, options);
  }
  /**
   * Update certain properties of an evaluation.
   */
  update(evalID, body, options) {
    return this._client.post(path3`/evals/${evalID}`, { body, ...options });
  }
  /**
   * List evaluations for a project.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/evals", CursorPage, { query, ...options });
  }
  /**
   * Delete an evaluation.
   */
  delete(evalID, options) {
    return this._client.delete(path3`/evals/${evalID}`, options);
  }
};
Evals.Runs = Runs2;

// node_modules/openai/resources/files.mjs
init_esm();
var Files3 = class extends APIResource2 {
  static {
    __name(this, "Files");
  }
  /**
   * Upload a file that can be used across various endpoints. Individual files can be
   * up to 512 MB, and each project can store up to 2.5 TB of files in total. There
   * is no organization-wide storage limit.
   *
   * - The Assistants API supports files up to 2 million tokens and of specific file
   *   types. See the
   *   [Assistants Tools guide](https://platform.openai.com/docs/assistants/tools)
   *   for details.
   * - The Fine-tuning API only supports `.jsonl` files. The input also has certain
   *   required formats for fine-tuning
   *   [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input)
   *   or
   *   [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input)
   *   models.
   * - The Batch API only supports `.jsonl` files up to 200 MB in size. The input
   *   also has a specific required
   *   [format](https://platform.openai.com/docs/api-reference/batch/request-input).
   *
   * Please [contact us](https://help.openai.com/) if you need to increase these
   * storage limits.
   */
  create(body, options) {
    return this._client.post("/files", multipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Returns information about a specific file.
   */
  retrieve(fileID, options) {
    return this._client.get(path3`/files/${fileID}`, options);
  }
  /**
   * Returns a list of files.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/files", CursorPage, { query, ...options });
  }
  /**
   * Delete a file and remove it from all vector stores.
   */
  delete(fileID, options) {
    return this._client.delete(path3`/files/${fileID}`, options);
  }
  /**
   * Returns the contents of the specified file.
   */
  content(fileID, options) {
    return this._client.get(path3`/files/${fileID}/content`, {
      ...options,
      headers: buildHeaders2([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
  /**
   * Waits for the given file to be processed, default timeout is 30 mins.
   */
  async waitForProcessing(id, { pollInterval = 5e3, maxWait = 30 * 60 * 1e3 } = {}) {
    const TERMINAL_STATES = /* @__PURE__ */ new Set(["processed", "error", "deleted"]);
    const start = Date.now();
    let file = await this.retrieve(id);
    while (!file.status || !TERMINAL_STATES.has(file.status)) {
      await sleep2(pollInterval);
      file = await this.retrieve(id);
      if (Date.now() - start > maxWait) {
        throw new APIConnectionTimeoutError2({
          message: `Giving up on waiting for file ${id} to finish processing after ${maxWait} milliseconds.`
        });
      }
    }
    return file;
  }
};

// node_modules/openai/resources/fine-tuning/fine-tuning.mjs
init_esm();

// node_modules/openai/resources/fine-tuning/methods.mjs
init_esm();
var Methods = class extends APIResource2 {
  static {
    __name(this, "Methods");
  }
};

// node_modules/openai/resources/fine-tuning/alpha/alpha.mjs
init_esm();

// node_modules/openai/resources/fine-tuning/alpha/graders.mjs
init_esm();
var Graders = class extends APIResource2 {
  static {
    __name(this, "Graders");
  }
  /**
   * Run a grader.
   *
   * @example
   * ```ts
   * const response = await client.fineTuning.alpha.graders.run({
   *   grader: {
   *     input: 'input',
   *     name: 'name',
   *     operation: 'eq',
   *     reference: 'reference',
   *     type: 'string_check',
   *   },
   *   model_sample: 'model_sample',
   * });
   * ```
   */
  run(body, options) {
    return this._client.post("/fine_tuning/alpha/graders/run", { body, ...options });
  }
  /**
   * Validate a grader.
   *
   * @example
   * ```ts
   * const response =
   *   await client.fineTuning.alpha.graders.validate({
   *     grader: {
   *       input: 'input',
   *       name: 'name',
   *       operation: 'eq',
   *       reference: 'reference',
   *       type: 'string_check',
   *     },
   *   });
   * ```
   */
  validate(body, options) {
    return this._client.post("/fine_tuning/alpha/graders/validate", { body, ...options });
  }
};

// node_modules/openai/resources/fine-tuning/alpha/alpha.mjs
var Alpha = class extends APIResource2 {
  static {
    __name(this, "Alpha");
  }
  constructor() {
    super(...arguments);
    this.graders = new Graders(this._client);
  }
};
Alpha.Graders = Graders;

// node_modules/openai/resources/fine-tuning/checkpoints/checkpoints.mjs
init_esm();

// node_modules/openai/resources/fine-tuning/checkpoints/permissions.mjs
init_esm();
var Permissions = class extends APIResource2 {
  static {
    __name(this, "Permissions");
  }
  /**
   * **NOTE:** Calling this endpoint requires an [admin API key](../admin-api-keys).
   *
   * This enables organization owners to share fine-tuned models with other projects
   * in their organization.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const permissionCreateResponse of client.fineTuning.checkpoints.permissions.create(
   *   'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *   { project_ids: ['string'] },
   * )) {
   *   // ...
   * }
   * ```
   */
  create(fineTunedModelCheckpoint, body, options) {
    return this._client.getAPIList(path3`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, Page, { body, method: "post", ...options });
  }
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to view all permissions for a
   * fine-tuned model checkpoint.
   *
   * @deprecated Retrieve is deprecated. Please swap to the paginated list method instead.
   */
  retrieve(fineTunedModelCheckpoint, query = {}, options) {
    return this._client.get(path3`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, {
      query,
      ...options
    });
  }
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to view all permissions for a
   * fine-tuned model checkpoint.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const permissionListResponse of client.fineTuning.checkpoints.permissions.list(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(fineTunedModelCheckpoint, query = {}, options) {
    return this._client.getAPIList(path3`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, ConversationCursorPage, { query, ...options });
  }
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to delete a permission for a
   * fine-tuned model checkpoint.
   *
   * @example
   * ```ts
   * const permission =
   *   await client.fineTuning.checkpoints.permissions.delete(
   *     'cp_zc4Q7MP6XxulcVzj4MZdwsAB',
   *     {
   *       fine_tuned_model_checkpoint:
   *         'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *     },
   *   );
   * ```
   */
  delete(permissionID, params, options) {
    const { fine_tuned_model_checkpoint } = params;
    return this._client.delete(path3`/fine_tuning/checkpoints/${fine_tuned_model_checkpoint}/permissions/${permissionID}`, options);
  }
};

// node_modules/openai/resources/fine-tuning/checkpoints/checkpoints.mjs
var Checkpoints = class extends APIResource2 {
  static {
    __name(this, "Checkpoints");
  }
  constructor() {
    super(...arguments);
    this.permissions = new Permissions(this._client);
  }
};
Checkpoints.Permissions = Permissions;

// node_modules/openai/resources/fine-tuning/jobs/jobs.mjs
init_esm();

// node_modules/openai/resources/fine-tuning/jobs/checkpoints.mjs
init_esm();
var Checkpoints2 = class extends APIResource2 {
  static {
    __name(this, "Checkpoints");
  }
  /**
   * List checkpoints for a fine-tuning job.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJobCheckpoint of client.fineTuning.jobs.checkpoints.list(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(fineTuningJobID, query = {}, options) {
    return this._client.getAPIList(path3`/fine_tuning/jobs/${fineTuningJobID}/checkpoints`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/resources/fine-tuning/jobs/jobs.mjs
var Jobs = class extends APIResource2 {
  static {
    __name(this, "Jobs");
  }
  constructor() {
    super(...arguments);
    this.checkpoints = new Checkpoints2(this._client);
  }
  /**
   * Creates a fine-tuning job which begins the process of creating a new model from
   * a given dataset.
   *
   * Response includes details of the enqueued job including job status and the name
   * of the fine-tuned models once complete.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.create({
   *   model: 'gpt-4o-mini',
   *   training_file: 'file-abc123',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/fine_tuning/jobs", { body, ...options });
  }
  /**
   * Get info about a fine-tuning job.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.retrieve(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  retrieve(fineTuningJobID, options) {
    return this._client.get(path3`/fine_tuning/jobs/${fineTuningJobID}`, options);
  }
  /**
   * List your organization's fine-tuning jobs
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJob of client.fineTuning.jobs.list()) {
   *   // ...
   * }
   * ```
   */
  list(query = {}, options) {
    return this._client.getAPIList("/fine_tuning/jobs", CursorPage, { query, ...options });
  }
  /**
   * Immediately cancel a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.cancel(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  cancel(fineTuningJobID, options) {
    return this._client.post(path3`/fine_tuning/jobs/${fineTuningJobID}/cancel`, options);
  }
  /**
   * Get status updates for a fine-tuning job.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJobEvent of client.fineTuning.jobs.listEvents(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * )) {
   *   // ...
   * }
   * ```
   */
  listEvents(fineTuningJobID, query = {}, options) {
    return this._client.getAPIList(path3`/fine_tuning/jobs/${fineTuningJobID}/events`, CursorPage, { query, ...options });
  }
  /**
   * Pause a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.pause(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  pause(fineTuningJobID, options) {
    return this._client.post(path3`/fine_tuning/jobs/${fineTuningJobID}/pause`, options);
  }
  /**
   * Resume a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.resume(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  resume(fineTuningJobID, options) {
    return this._client.post(path3`/fine_tuning/jobs/${fineTuningJobID}/resume`, options);
  }
};
Jobs.Checkpoints = Checkpoints2;

// node_modules/openai/resources/fine-tuning/fine-tuning.mjs
var FineTuning = class extends APIResource2 {
  static {
    __name(this, "FineTuning");
  }
  constructor() {
    super(...arguments);
    this.methods = new Methods(this._client);
    this.jobs = new Jobs(this._client);
    this.checkpoints = new Checkpoints(this._client);
    this.alpha = new Alpha(this._client);
  }
};
FineTuning.Methods = Methods;
FineTuning.Jobs = Jobs;
FineTuning.Checkpoints = Checkpoints;
FineTuning.Alpha = Alpha;

// node_modules/openai/resources/graders/graders.mjs
init_esm();

// node_modules/openai/resources/graders/grader-models.mjs
init_esm();
var GraderModels = class extends APIResource2 {
  static {
    __name(this, "GraderModels");
  }
};

// node_modules/openai/resources/graders/graders.mjs
var Graders2 = class extends APIResource2 {
  static {
    __name(this, "Graders");
  }
  constructor() {
    super(...arguments);
    this.graderModels = new GraderModels(this._client);
  }
};
Graders2.GraderModels = GraderModels;

// node_modules/openai/resources/images.mjs
init_esm();
var Images = class extends APIResource2 {
  static {
    __name(this, "Images");
  }
  /**
   * Creates a variation of a given image. This endpoint only supports `dall-e-2`.
   *
   * @example
   * ```ts
   * const imagesResponse = await client.images.createVariation({
   *   image: fs.createReadStream('otter.png'),
   * });
   * ```
   */
  createVariation(body, options) {
    return this._client.post("/images/variations", multipartFormRequestOptions({ body, ...options }, this._client));
  }
  edit(body, options) {
    return this._client.post("/images/edits", multipartFormRequestOptions({ body, ...options, stream: body.stream ?? false }, this._client));
  }
  generate(body, options) {
    return this._client.post("/images/generations", { body, ...options, stream: body.stream ?? false });
  }
};

// node_modules/openai/resources/models.mjs
init_esm();
var Models = class extends APIResource2 {
  static {
    __name(this, "Models");
  }
  /**
   * Retrieves a model instance, providing basic information about the model such as
   * the owner and permissioning.
   */
  retrieve(model, options) {
    return this._client.get(path3`/models/${model}`, options);
  }
  /**
   * Lists the currently available models, and provides basic information about each
   * one such as the owner and availability.
   */
  list(options) {
    return this._client.getAPIList("/models", Page, options);
  }
  /**
   * Delete a fine-tuned model. You must have the Owner role in your organization to
   * delete a model.
   */
  delete(model, options) {
    return this._client.delete(path3`/models/${model}`, options);
  }
};

// node_modules/openai/resources/moderations.mjs
init_esm();
var Moderations = class extends APIResource2 {
  static {
    __name(this, "Moderations");
  }
  /**
   * Classifies if text and/or image inputs are potentially harmful. Learn more in
   * the [moderation guide](https://platform.openai.com/docs/guides/moderation).
   */
  create(body, options) {
    return this._client.post("/moderations", { body, ...options });
  }
};

// node_modules/openai/resources/realtime/realtime.mjs
init_esm();

// node_modules/openai/resources/realtime/calls.mjs
init_esm();
var Calls = class extends APIResource2 {
  static {
    __name(this, "Calls");
  }
  /**
   * Accept an incoming SIP call and configure the realtime session that will handle
   * it.
   *
   * @example
   * ```ts
   * await client.realtime.calls.accept('call_id', {
   *   type: 'realtime',
   * });
   * ```
   */
  accept(callID, body, options) {
    return this._client.post(path3`/realtime/calls/${callID}/accept`, {
      body,
      ...options,
      headers: buildHeaders2([{ Accept: "*/*" }, options?.headers])
    });
  }
  /**
   * End an active Realtime API call, whether it was initiated over SIP or WebRTC.
   *
   * @example
   * ```ts
   * await client.realtime.calls.hangup('call_id');
   * ```
   */
  hangup(callID, options) {
    return this._client.post(path3`/realtime/calls/${callID}/hangup`, {
      ...options,
      headers: buildHeaders2([{ Accept: "*/*" }, options?.headers])
    });
  }
  /**
   * Transfer an active SIP call to a new destination using the SIP REFER verb.
   *
   * @example
   * ```ts
   * await client.realtime.calls.refer('call_id', {
   *   target_uri: 'tel:+14155550123',
   * });
   * ```
   */
  refer(callID, body, options) {
    return this._client.post(path3`/realtime/calls/${callID}/refer`, {
      body,
      ...options,
      headers: buildHeaders2([{ Accept: "*/*" }, options?.headers])
    });
  }
  /**
   * Decline an incoming SIP call by returning a SIP status code to the caller.
   *
   * @example
   * ```ts
   * await client.realtime.calls.reject('call_id');
   * ```
   */
  reject(callID, body = {}, options) {
    return this._client.post(path3`/realtime/calls/${callID}/reject`, {
      body,
      ...options,
      headers: buildHeaders2([{ Accept: "*/*" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/realtime/client-secrets.mjs
init_esm();
var ClientSecrets = class extends APIResource2 {
  static {
    __name(this, "ClientSecrets");
  }
  /**
   * Create a Realtime client secret with an associated session configuration.
   *
   * Client secrets are short-lived tokens that can be passed to a client app, such
   * as a web frontend or mobile client, which grants access to the Realtime API
   * without leaking your main API key. You can configure a custom TTL for each
   * client secret.
   *
   * You can also attach session configuration options to the client secret, which
   * will be applied to any sessions created using that client secret, but these can
   * also be overridden by the client connection.
   *
   * [Learn more about authentication with client secrets over WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc).
   *
   * Returns the created client secret and the effective session object. The client
   * secret is a string that looks like `ek_1234`.
   *
   * @example
   * ```ts
   * const clientSecret =
   *   await client.realtime.clientSecrets.create();
   * ```
   */
  create(body, options) {
    return this._client.post("/realtime/client_secrets", { body, ...options });
  }
};

// node_modules/openai/resources/realtime/realtime.mjs
var Realtime3 = class extends APIResource2 {
  static {
    __name(this, "Realtime");
  }
  constructor() {
    super(...arguments);
    this.clientSecrets = new ClientSecrets(this._client);
    this.calls = new Calls(this._client);
  }
};
Realtime3.ClientSecrets = ClientSecrets;
Realtime3.Calls = Calls;

// node_modules/openai/resources/responses/responses.mjs
init_esm();

// node_modules/openai/lib/ResponsesParser.mjs
init_esm();
function maybeParseResponse(response, params) {
  if (!params || !hasAutoParseableInput2(params)) {
    return {
      ...response,
      output_parsed: null,
      output: response.output.map((item) => {
        if (item.type === "function_call") {
          return {
            ...item,
            parsed_arguments: null
          };
        }
        if (item.type === "message") {
          return {
            ...item,
            content: item.content.map((content) => ({
              ...content,
              parsed: null
            }))
          };
        } else {
          return item;
        }
      })
    };
  }
  return parseResponse(response, params);
}
__name(maybeParseResponse, "maybeParseResponse");
function parseResponse(response, params) {
  const output = response.output.map((item) => {
    if (item.type === "function_call") {
      return {
        ...item,
        parsed_arguments: parseToolCall2(params, item)
      };
    }
    if (item.type === "message") {
      const content = item.content.map((content2) => {
        if (content2.type === "output_text") {
          return {
            ...content2,
            parsed: parseTextFormat(params, content2.text)
          };
        }
        return content2;
      });
      return {
        ...item,
        content
      };
    }
    return item;
  });
  const parsed = Object.assign({}, response, { output });
  if (!Object.getOwnPropertyDescriptor(response, "output_text")) {
    addOutputText(parsed);
  }
  Object.defineProperty(parsed, "output_parsed", {
    enumerable: true,
    get() {
      for (const output2 of parsed.output) {
        if (output2.type !== "message") {
          continue;
        }
        for (const content of output2.content) {
          if (content.type === "output_text" && content.parsed !== null) {
            return content.parsed;
          }
        }
      }
      return null;
    }
  });
  return parsed;
}
__name(parseResponse, "parseResponse");
function parseTextFormat(params, content) {
  if (params.text?.format?.type !== "json_schema") {
    return null;
  }
  if ("$parseRaw" in params.text?.format) {
    const text_format = params.text?.format;
    return text_format.$parseRaw(content);
  }
  return JSON.parse(content);
}
__name(parseTextFormat, "parseTextFormat");
function hasAutoParseableInput2(params) {
  if (isAutoParsableResponseFormat(params.text?.format)) {
    return true;
  }
  return false;
}
__name(hasAutoParseableInput2, "hasAutoParseableInput");
function isAutoParsableTool2(tool) {
  return tool?.["$brand"] === "auto-parseable-tool";
}
__name(isAutoParsableTool2, "isAutoParsableTool");
function getInputToolByName(input_tools, name) {
  return input_tools.find((tool) => tool.type === "function" && tool.name === name);
}
__name(getInputToolByName, "getInputToolByName");
function parseToolCall2(params, toolCall) {
  const inputTool = getInputToolByName(params.tools ?? [], toolCall.name);
  return {
    ...toolCall,
    ...toolCall,
    parsed_arguments: isAutoParsableTool2(inputTool) ? inputTool.$parseRaw(toolCall.arguments) : inputTool?.strict ? JSON.parse(toolCall.arguments) : null
  };
}
__name(parseToolCall2, "parseToolCall");
function addOutputText(rsp) {
  const texts = [];
  for (const output of rsp.output) {
    if (output.type !== "message") {
      continue;
    }
    for (const content of output.content) {
      if (content.type === "output_text") {
        texts.push(content.text);
      }
    }
  }
  rsp.output_text = texts.join("");
}
__name(addOutputText, "addOutputText");

// node_modules/openai/lib/responses/ResponseStream.mjs
init_esm();
var _ResponseStream_instances;
var _ResponseStream_params;
var _ResponseStream_currentResponseSnapshot;
var _ResponseStream_finalResponse;
var _ResponseStream_beginRequest;
var _ResponseStream_addEvent;
var _ResponseStream_endRequest;
var _ResponseStream_accumulateResponse;
var ResponseStream = class _ResponseStream extends EventStream {
  static {
    __name(this, "ResponseStream");
  }
  constructor(params) {
    super();
    _ResponseStream_instances.add(this);
    _ResponseStream_params.set(this, void 0);
    _ResponseStream_currentResponseSnapshot.set(this, void 0);
    _ResponseStream_finalResponse.set(this, void 0);
    __classPrivateFieldSet2(this, _ResponseStream_params, params, "f");
  }
  static createResponse(client, params, options) {
    const runner = new _ResponseStream(params);
    runner._run(() => runner._createOrRetrieveResponse(client, params, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  async _createOrRetrieveResponse(client, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet2(this, _ResponseStream_instances, "m", _ResponseStream_beginRequest).call(this);
    let stream;
    let starting_after = null;
    if ("response_id" in params) {
      stream = await client.responses.retrieve(params.response_id, { stream: true }, { ...options, signal: this.controller.signal, stream: true });
      starting_after = params.starting_after ?? null;
    } else {
      stream = await client.responses.create({ ...params, stream: true }, { ...options, signal: this.controller.signal });
    }
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet2(this, _ResponseStream_instances, "m", _ResponseStream_addEvent).call(this, event, starting_after);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError2();
    }
    return __classPrivateFieldGet2(this, _ResponseStream_instances, "m", _ResponseStream_endRequest).call(this);
  }
  [(_ResponseStream_params = /* @__PURE__ */ new WeakMap(), _ResponseStream_currentResponseSnapshot = /* @__PURE__ */ new WeakMap(), _ResponseStream_finalResponse = /* @__PURE__ */ new WeakMap(), _ResponseStream_instances = /* @__PURE__ */ new WeakSet(), _ResponseStream_beginRequest = /* @__PURE__ */ __name(function _ResponseStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet2(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
  }, "_ResponseStream_beginRequest"), _ResponseStream_addEvent = /* @__PURE__ */ __name(function _ResponseStream_addEvent2(event, starting_after) {
    if (this.ended)
      return;
    const maybeEmit = /* @__PURE__ */ __name((name, event2) => {
      if (starting_after == null || event2.sequence_number > starting_after) {
        this._emit(name, event2);
      }
    }, "maybeEmit");
    const response = __classPrivateFieldGet2(this, _ResponseStream_instances, "m", _ResponseStream_accumulateResponse).call(this, event);
    maybeEmit("event", event);
    switch (event.type) {
      case "response.output_text.delta": {
        const output = response.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "message") {
          const content = output.content[event.content_index];
          if (!content) {
            throw new OpenAIError(`missing content at index ${event.content_index}`);
          }
          if (content.type !== "output_text") {
            throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
          }
          maybeEmit("response.output_text.delta", {
            ...event,
            snapshot: content.text
          });
        }
        break;
      }
      case "response.function_call_arguments.delta": {
        const output = response.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "function_call") {
          maybeEmit("response.function_call_arguments.delta", {
            ...event,
            snapshot: output.arguments
          });
        }
        break;
      }
      default:
        maybeEmit(event.type, event);
        break;
    }
  }, "_ResponseStream_addEvent"), _ResponseStream_endRequest = /* @__PURE__ */ __name(function _ResponseStream_endRequest2() {
    if (this.ended) {
      throw new OpenAIError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet2(this, _ResponseStream_currentResponseSnapshot, "f");
    if (!snapshot) {
      throw new OpenAIError(`request ended without sending any events`);
    }
    __classPrivateFieldSet2(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
    const parsedResponse = finalizeResponse(snapshot, __classPrivateFieldGet2(this, _ResponseStream_params, "f"));
    __classPrivateFieldSet2(this, _ResponseStream_finalResponse, parsedResponse, "f");
    return parsedResponse;
  }, "_ResponseStream_endRequest"), _ResponseStream_accumulateResponse = /* @__PURE__ */ __name(function _ResponseStream_accumulateResponse2(event) {
    let snapshot = __classPrivateFieldGet2(this, _ResponseStream_currentResponseSnapshot, "f");
    if (!snapshot) {
      if (event.type !== "response.created") {
        throw new OpenAIError(`When snapshot hasn't been set yet, expected 'response.created' event, got ${event.type}`);
      }
      snapshot = __classPrivateFieldSet2(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
      return snapshot;
    }
    switch (event.type) {
      case "response.output_item.added": {
        snapshot.output.push(event.item);
        break;
      }
      case "response.content_part.added": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        const type = output.type;
        const part = event.part;
        if (type === "message" && part.type !== "reasoning_text") {
          output.content.push(part);
        } else if (type === "reasoning" && part.type === "reasoning_text") {
          if (!output.content) {
            output.content = [];
          }
          output.content.push(part);
        }
        break;
      }
      case "response.output_text.delta": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "message") {
          const content = output.content[event.content_index];
          if (!content) {
            throw new OpenAIError(`missing content at index ${event.content_index}`);
          }
          if (content.type !== "output_text") {
            throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
          }
          content.text += event.delta;
        }
        break;
      }
      case "response.function_call_arguments.delta": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "function_call") {
          output.arguments += event.delta;
        }
        break;
      }
      case "response.reasoning_text.delta": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "reasoning") {
          const content = output.content?.[event.content_index];
          if (!content) {
            throw new OpenAIError(`missing content at index ${event.content_index}`);
          }
          if (content.type !== "reasoning_text") {
            throw new OpenAIError(`expected content to be 'reasoning_text', got ${content.type}`);
          }
          content.text += event.delta;
        }
        break;
      }
      case "response.completed": {
        __classPrivateFieldSet2(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
        break;
      }
    }
    return snapshot;
  }, "_ResponseStream_accumulateResponse"), Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("event", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: /* @__PURE__ */ __name(async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((event2) => event2 ? { value: event2, done: false } : { value: void 0, done: true });
        }
        const event = pushQueue.shift();
        return { value: event, done: false };
      }, "next"),
      return: /* @__PURE__ */ __name(async () => {
        this.abort();
        return { value: void 0, done: true };
      }, "return")
    };
  }
  /**
   * @returns a promise that resolves with the final Response, or rejects
   * if an error occurred or the stream ended prematurely without producing a REsponse.
   */
  async finalResponse() {
    await this.done();
    const response = __classPrivateFieldGet2(this, _ResponseStream_finalResponse, "f");
    if (!response)
      throw new OpenAIError("stream ended without producing a ChatCompletion");
    return response;
  }
};
function finalizeResponse(snapshot, params) {
  return maybeParseResponse(snapshot, params);
}
__name(finalizeResponse, "finalizeResponse");

// node_modules/openai/resources/responses/input-items.mjs
init_esm();
var InputItems = class extends APIResource2 {
  static {
    __name(this, "InputItems");
  }
  /**
   * Returns a list of input items for a given response.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const responseItem of client.responses.inputItems.list(
   *   'response_id',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(responseID, query = {}, options) {
    return this._client.getAPIList(path3`/responses/${responseID}/input_items`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/resources/responses/input-tokens.mjs
init_esm();
var InputTokens = class extends APIResource2 {
  static {
    __name(this, "InputTokens");
  }
  /**
   * Returns input token counts of the request.
   *
   * Returns an object with `object` set to `response.input_tokens` and an
   * `input_tokens` count.
   *
   * @example
   * ```ts
   * const response = await client.responses.inputTokens.count();
   * ```
   */
  count(body = {}, options) {
    return this._client.post("/responses/input_tokens", { body, ...options });
  }
};

// node_modules/openai/resources/responses/responses.mjs
var Responses = class extends APIResource2 {
  static {
    __name(this, "Responses");
  }
  constructor() {
    super(...arguments);
    this.inputItems = new InputItems(this._client);
    this.inputTokens = new InputTokens(this._client);
  }
  create(body, options) {
    return this._client.post("/responses", { body, ...options, stream: body.stream ?? false })._thenUnwrap((rsp) => {
      if ("object" in rsp && rsp.object === "response") {
        addOutputText(rsp);
      }
      return rsp;
    });
  }
  retrieve(responseID, query = {}, options) {
    return this._client.get(path3`/responses/${responseID}`, {
      query,
      ...options,
      stream: query?.stream ?? false
    })._thenUnwrap((rsp) => {
      if ("object" in rsp && rsp.object === "response") {
        addOutputText(rsp);
      }
      return rsp;
    });
  }
  /**
   * Deletes a model response with the given ID.
   *
   * @example
   * ```ts
   * await client.responses.delete(
   *   'resp_677efb5139a88190b512bc3fef8e535d',
   * );
   * ```
   */
  delete(responseID, options) {
    return this._client.delete(path3`/responses/${responseID}`, {
      ...options,
      headers: buildHeaders2([{ Accept: "*/*" }, options?.headers])
    });
  }
  parse(body, options) {
    return this._client.responses.create(body, options)._thenUnwrap((response) => parseResponse(response, body));
  }
  /**
   * Creates a model response stream
   */
  stream(body, options) {
    return ResponseStream.createResponse(this._client, body, options);
  }
  /**
   * Cancels a model response with the given ID. Only responses created with the
   * `background` parameter set to `true` can be cancelled.
   * [Learn more](https://platform.openai.com/docs/guides/background).
   *
   * @example
   * ```ts
   * const response = await client.responses.cancel(
   *   'resp_677efb5139a88190b512bc3fef8e535d',
   * );
   * ```
   */
  cancel(responseID, options) {
    return this._client.post(path3`/responses/${responseID}/cancel`, options);
  }
  /**
   * Compact a conversation. Returns a compacted response object.
   *
   * Learn when and how to compact long-running conversations in the
   * [conversation state guide](https://platform.openai.com/docs/guides/conversation-state#managing-the-context-window).
   * For ZDR-compatible compaction details, see
   * [Compaction (advanced)](https://platform.openai.com/docs/guides/conversation-state#compaction-advanced).
   *
   * @example
   * ```ts
   * const compactedResponse = await client.responses.compact({
   *   model: 'gpt-5.4',
   * });
   * ```
   */
  compact(body, options) {
    return this._client.post("/responses/compact", { body, ...options });
  }
};
Responses.InputItems = InputItems;
Responses.InputTokens = InputTokens;

// node_modules/openai/resources/skills/skills.mjs
init_esm();

// node_modules/openai/resources/skills/content.mjs
init_esm();
var Content2 = class extends APIResource2 {
  static {
    __name(this, "Content");
  }
  /**
   * Download a skill zip bundle by its ID.
   */
  retrieve(skillID, options) {
    return this._client.get(path3`/skills/${skillID}/content`, {
      ...options,
      headers: buildHeaders2([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
};

// node_modules/openai/resources/skills/versions/versions.mjs
init_esm();

// node_modules/openai/resources/skills/versions/content.mjs
init_esm();
var Content3 = class extends APIResource2 {
  static {
    __name(this, "Content");
  }
  /**
   * Download a skill version zip bundle.
   */
  retrieve(version2, params, options) {
    const { skill_id } = params;
    return this._client.get(path3`/skills/${skill_id}/versions/${version2}/content`, {
      ...options,
      headers: buildHeaders2([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
};

// node_modules/openai/resources/skills/versions/versions.mjs
var Versions = class extends APIResource2 {
  static {
    __name(this, "Versions");
  }
  constructor() {
    super(...arguments);
    this.content = new Content3(this._client);
  }
  /**
   * Create a new immutable skill version.
   */
  create(skillID, body = {}, options) {
    return this._client.post(path3`/skills/${skillID}/versions`, maybeMultipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Get a specific skill version.
   */
  retrieve(version2, params, options) {
    const { skill_id } = params;
    return this._client.get(path3`/skills/${skill_id}/versions/${version2}`, options);
  }
  /**
   * List skill versions for a skill.
   */
  list(skillID, query = {}, options) {
    return this._client.getAPIList(path3`/skills/${skillID}/versions`, CursorPage, {
      query,
      ...options
    });
  }
  /**
   * Delete a skill version.
   */
  delete(version2, params, options) {
    const { skill_id } = params;
    return this._client.delete(path3`/skills/${skill_id}/versions/${version2}`, options);
  }
};
Versions.Content = Content3;

// node_modules/openai/resources/skills/skills.mjs
var Skills = class extends APIResource2 {
  static {
    __name(this, "Skills");
  }
  constructor() {
    super(...arguments);
    this.content = new Content2(this._client);
    this.versions = new Versions(this._client);
  }
  /**
   * Create a new skill.
   */
  create(body = {}, options) {
    return this._client.post("/skills", maybeMultipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Get a skill by its ID.
   */
  retrieve(skillID, options) {
    return this._client.get(path3`/skills/${skillID}`, options);
  }
  /**
   * Update the default version pointer for a skill.
   */
  update(skillID, body, options) {
    return this._client.post(path3`/skills/${skillID}`, { body, ...options });
  }
  /**
   * List all skills for the current project.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/skills", CursorPage, { query, ...options });
  }
  /**
   * Delete a skill by its ID.
   */
  delete(skillID, options) {
    return this._client.delete(path3`/skills/${skillID}`, options);
  }
};
Skills.Content = Content2;
Skills.Versions = Versions;

// node_modules/openai/resources/uploads/uploads.mjs
init_esm();

// node_modules/openai/resources/uploads/parts.mjs
init_esm();
var Parts = class extends APIResource2 {
  static {
    __name(this, "Parts");
  }
  /**
   * Adds a
   * [Part](https://platform.openai.com/docs/api-reference/uploads/part-object) to an
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object.
   * A Part represents a chunk of bytes from the file you are trying to upload.
   *
   * Each Part can be at most 64 MB, and you can add Parts until you hit the Upload
   * maximum of 8 GB.
   *
   * It is possible to add multiple Parts in parallel. You can decide the intended
   * order of the Parts when you
   * [complete the Upload](https://platform.openai.com/docs/api-reference/uploads/complete).
   */
  create(uploadID, body, options) {
    return this._client.post(path3`/uploads/${uploadID}/parts`, multipartFormRequestOptions({ body, ...options }, this._client));
  }
};

// node_modules/openai/resources/uploads/uploads.mjs
var Uploads = class extends APIResource2 {
  static {
    __name(this, "Uploads");
  }
  constructor() {
    super(...arguments);
    this.parts = new Parts(this._client);
  }
  /**
   * Creates an intermediate
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object
   * that you can add
   * [Parts](https://platform.openai.com/docs/api-reference/uploads/part-object) to.
   * Currently, an Upload can accept at most 8 GB in total and expires after an hour
   * after you create it.
   *
   * Once you complete the Upload, we will create a
   * [File](https://platform.openai.com/docs/api-reference/files/object) object that
   * contains all the parts you uploaded. This File is usable in the rest of our
   * platform as a regular File object.
   *
   * For certain `purpose` values, the correct `mime_type` must be specified. Please
   * refer to documentation for the
   * [supported MIME types for your use case](https://platform.openai.com/docs/assistants/tools/file-search#supported-files).
   *
   * For guidance on the proper filename extensions for each purpose, please follow
   * the documentation on
   * [creating a File](https://platform.openai.com/docs/api-reference/files/create).
   *
   * Returns the Upload object with status `pending`.
   */
  create(body, options) {
    return this._client.post("/uploads", { body, ...options });
  }
  /**
   * Cancels the Upload. No Parts may be added after an Upload is cancelled.
   *
   * Returns the Upload object with status `cancelled`.
   */
  cancel(uploadID, options) {
    return this._client.post(path3`/uploads/${uploadID}/cancel`, options);
  }
  /**
   * Completes the
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object).
   *
   * Within the returned Upload object, there is a nested
   * [File](https://platform.openai.com/docs/api-reference/files/object) object that
   * is ready to use in the rest of the platform.
   *
   * You can specify the order of the Parts by passing in an ordered list of the Part
   * IDs.
   *
   * The number of bytes uploaded upon completion must match the number of bytes
   * initially specified when creating the Upload object. No Parts may be added after
   * an Upload is completed. Returns the Upload object with status `completed`,
   * including an additional `file` property containing the created usable File
   * object.
   */
  complete(uploadID, body, options) {
    return this._client.post(path3`/uploads/${uploadID}/complete`, { body, ...options });
  }
};
Uploads.Parts = Parts;

// node_modules/openai/resources/vector-stores/vector-stores.mjs
init_esm();

// node_modules/openai/resources/vector-stores/file-batches.mjs
init_esm();

// node_modules/openai/lib/Util.mjs
init_esm();
var allSettledWithThrow = /* @__PURE__ */ __name(async (promises) => {
  const results = await Promise.allSettled(promises);
  const rejected = results.filter((result) => result.status === "rejected");
  if (rejected.length) {
    for (const result of rejected) {
      console.error(result.reason);
    }
    throw new Error(`${rejected.length} promise(s) failed - see the above errors`);
  }
  const values = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      values.push(result.value);
    }
  }
  return values;
}, "allSettledWithThrow");

// node_modules/openai/resources/vector-stores/file-batches.mjs
var FileBatches = class extends APIResource2 {
  static {
    __name(this, "FileBatches");
  }
  /**
   * Create a vector store file batch.
   */
  create(vectorStoreID, body, options) {
    return this._client.post(path3`/vector_stores/${vectorStoreID}/file_batches`, {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a vector store file batch.
   */
  retrieve(batchID, params, options) {
    const { vector_store_id } = params;
    return this._client.get(path3`/vector_stores/${vector_store_id}/file_batches/${batchID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Cancel a vector store file batch. This attempts to cancel the processing of
   * files in this batch as soon as possible.
   */
  cancel(batchID, params, options) {
    const { vector_store_id } = params;
    return this._client.post(path3`/vector_stores/${vector_store_id}/file_batches/${batchID}/cancel`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Create a vector store batch and poll until all files have been processed.
   */
  async createAndPoll(vectorStoreId, body, options) {
    const batch = await this.create(vectorStoreId, body);
    return await this.poll(vectorStoreId, batch.id, options);
  }
  /**
   * Returns a list of vector store files in a batch.
   */
  listFiles(batchID, params, options) {
    const { vector_store_id, ...query } = params;
    return this._client.getAPIList(path3`/vector_stores/${vector_store_id}/file_batches/${batchID}/files`, CursorPage, { query, ...options, headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]) });
  }
  /**
   * Wait for the given file batch to be processed.
   *
   * Note: this will return even if one of the files failed to process, you need to
   * check batch.file_counts.failed_count to handle this case.
   */
  async poll(vectorStoreID, batchID, options) {
    const headers = buildHeaders2([
      options?.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
      }
    ]);
    while (true) {
      const { data: batch, response } = await this.retrieve(batchID, { vector_store_id: vectorStoreID }, {
        ...options,
        headers
      }).withResponse();
      switch (batch.status) {
        case "in_progress":
          let sleepInterval = 5e3;
          if (options?.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep2(sleepInterval);
          break;
        case "failed":
        case "cancelled":
        case "completed":
          return batch;
      }
    }
  }
  /**
   * Uploads the given files concurrently and then creates a vector store file batch.
   *
   * The concurrency limit is configurable using the `maxConcurrency` parameter.
   */
  async uploadAndPoll(vectorStoreId, { files, fileIds = [] }, options) {
    if (files == null || files.length == 0) {
      throw new Error(`No \`files\` provided to process. If you've already uploaded files you should use \`.createAndPoll()\` instead`);
    }
    const configuredConcurrency = options?.maxConcurrency ?? 5;
    const concurrencyLimit = Math.min(configuredConcurrency, files.length);
    const client = this._client;
    const fileIterator = files.values();
    const allFileIds = [...fileIds];
    async function processFiles(iterator) {
      for (let item of iterator) {
        const fileObj = await client.files.create({ file: item, purpose: "assistants" }, options);
        allFileIds.push(fileObj.id);
      }
    }
    __name(processFiles, "processFiles");
    const workers = Array(concurrencyLimit).fill(fileIterator).map(processFiles);
    await allSettledWithThrow(workers);
    return await this.createAndPoll(vectorStoreId, {
      file_ids: allFileIds
    });
  }
};

// node_modules/openai/resources/vector-stores/files.mjs
init_esm();
var Files4 = class extends APIResource2 {
  static {
    __name(this, "Files");
  }
  /**
   * Create a vector store file by attaching a
   * [File](https://platform.openai.com/docs/api-reference/files) to a
   * [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object).
   */
  create(vectorStoreID, body, options) {
    return this._client.post(path3`/vector_stores/${vectorStoreID}/files`, {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a vector store file.
   */
  retrieve(fileID, params, options) {
    const { vector_store_id } = params;
    return this._client.get(path3`/vector_stores/${vector_store_id}/files/${fileID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Update attributes on a vector store file.
   */
  update(fileID, params, options) {
    const { vector_store_id, ...body } = params;
    return this._client.post(path3`/vector_stores/${vector_store_id}/files/${fileID}`, {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of vector store files.
   */
  list(vectorStoreID, query = {}, options) {
    return this._client.getAPIList(path3`/vector_stores/${vectorStoreID}/files`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete a vector store file. This will remove the file from the vector store but
   * the file itself will not be deleted. To delete the file, use the
   * [delete file](https://platform.openai.com/docs/api-reference/files/delete)
   * endpoint.
   */
  delete(fileID, params, options) {
    const { vector_store_id } = params;
    return this._client.delete(path3`/vector_stores/${vector_store_id}/files/${fileID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Attach a file to the given vector store and wait for it to be processed.
   */
  async createAndPoll(vectorStoreId, body, options) {
    const file = await this.create(vectorStoreId, body, options);
    return await this.poll(vectorStoreId, file.id, options);
  }
  /**
   * Wait for the vector store file to finish processing.
   *
   * Note: this will return even if the file failed to process, you need to check
   * file.last_error and file.status to handle these cases
   */
  async poll(vectorStoreID, fileID, options) {
    const headers = buildHeaders2([
      options?.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
      }
    ]);
    while (true) {
      const fileResponse = await this.retrieve(fileID, {
        vector_store_id: vectorStoreID
      }, { ...options, headers }).withResponse();
      const file = fileResponse.data;
      switch (file.status) {
        case "in_progress":
          let sleepInterval = 5e3;
          if (options?.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = fileResponse.response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep2(sleepInterval);
          break;
        case "failed":
        case "completed":
          return file;
      }
    }
  }
  /**
   * Upload a file to the `files` API and then attach it to the given vector store.
   *
   * Note the file will be asynchronously processed (you can use the alternative
   * polling helper method to wait for processing to complete).
   */
  async upload(vectorStoreId, file, options) {
    const fileInfo = await this._client.files.create({ file, purpose: "assistants" }, options);
    return this.create(vectorStoreId, { file_id: fileInfo.id }, options);
  }
  /**
   * Add a file to a vector store and poll until processing is complete.
   */
  async uploadAndPoll(vectorStoreId, file, options) {
    const fileInfo = await this.upload(vectorStoreId, file, options);
    return await this.poll(vectorStoreId, fileInfo.id, options);
  }
  /**
   * Retrieve the parsed contents of a vector store file.
   */
  content(fileID, params, options) {
    const { vector_store_id } = params;
    return this._client.getAPIList(path3`/vector_stores/${vector_store_id}/files/${fileID}/content`, Page, { ...options, headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]) });
  }
};

// node_modules/openai/resources/vector-stores/vector-stores.mjs
var VectorStores = class extends APIResource2 {
  static {
    __name(this, "VectorStores");
  }
  constructor() {
    super(...arguments);
    this.files = new Files4(this._client);
    this.fileBatches = new FileBatches(this._client);
  }
  /**
   * Create a vector store.
   */
  create(body, options) {
    return this._client.post("/vector_stores", {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a vector store.
   */
  retrieve(vectorStoreID, options) {
    return this._client.get(path3`/vector_stores/${vectorStoreID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a vector store.
   */
  update(vectorStoreID, body, options) {
    return this._client.post(path3`/vector_stores/${vectorStoreID}`, {
      body,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of vector stores.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/vector_stores", CursorPage, {
      query,
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete a vector store.
   */
  delete(vectorStoreID, options) {
    return this._client.delete(path3`/vector_stores/${vectorStoreID}`, {
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Search a vector store for relevant chunks based on a query and file attributes
   * filter.
   */
  search(vectorStoreID, body, options) {
    return this._client.getAPIList(path3`/vector_stores/${vectorStoreID}/search`, Page, {
      body,
      method: "post",
      ...options,
      headers: buildHeaders2([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};
VectorStores.Files = Files4;
VectorStores.FileBatches = FileBatches;

// node_modules/openai/resources/videos.mjs
init_esm();
var Videos = class extends APIResource2 {
  static {
    __name(this, "Videos");
  }
  /**
   * Create a new video generation job from a prompt and optional reference assets.
   */
  create(body, options) {
    return this._client.post("/videos", maybeMultipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Fetch the latest metadata for a generated video.
   */
  retrieve(videoID, options) {
    return this._client.get(path3`/videos/${videoID}`, options);
  }
  /**
   * List recently generated videos for the current project.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/videos", ConversationCursorPage, { query, ...options });
  }
  /**
   * Permanently delete a completed or failed video and its stored assets.
   */
  delete(videoID, options) {
    return this._client.delete(path3`/videos/${videoID}`, options);
  }
  /**
   * Download the generated video bytes or a derived preview asset.
   *
   * Streams the rendered video content for the specified video job.
   */
  downloadContent(videoID, query = {}, options) {
    return this._client.get(path3`/videos/${videoID}/content`, {
      query,
      ...options,
      headers: buildHeaders2([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
  /**
   * Create a remix of a completed video using a refreshed prompt.
   */
  remix(videoID, body, options) {
    return this._client.post(path3`/videos/${videoID}/remix`, maybeMultipartFormRequestOptions({ body, ...options }, this._client));
  }
};

// node_modules/openai/resources/webhooks.mjs
init_esm();

// node_modules/openai/resources/webhooks/index.mjs
init_esm();

// node_modules/openai/resources/webhooks/webhooks.mjs
init_esm();
var _Webhooks_instances;
var _Webhooks_validateSecret;
var _Webhooks_getRequiredHeader;
var Webhooks = class extends APIResource2 {
  static {
    __name(this, "Webhooks");
  }
  constructor() {
    super(...arguments);
    _Webhooks_instances.add(this);
  }
  /**
   * Validates that the given payload was sent by OpenAI and parses the payload.
   */
  async unwrap(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
    await this.verifySignature(payload, headers, secret, tolerance);
    return JSON.parse(payload);
  }
  /**
   * Validates whether or not the webhook payload was sent by OpenAI.
   *
   * An error will be raised if the webhook payload was not sent by OpenAI.
   *
   * @param payload - The webhook payload
   * @param headers - The webhook headers
   * @param secret - The webhook secret (optional, will use client secret if not provided)
   * @param tolerance - Maximum age of the webhook in seconds (default: 300 = 5 minutes)
   */
  async verifySignature(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
    if (typeof crypto === "undefined" || typeof crypto.subtle.importKey !== "function" || typeof crypto.subtle.verify !== "function") {
      throw new Error("Webhook signature verification is only supported when the `crypto` global is defined");
    }
    __classPrivateFieldGet2(this, _Webhooks_instances, "m", _Webhooks_validateSecret).call(this, secret);
    const headersObj = buildHeaders2([headers]).values;
    const signatureHeader = __classPrivateFieldGet2(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-signature");
    const timestamp = __classPrivateFieldGet2(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-timestamp");
    const webhookId = __classPrivateFieldGet2(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-id");
    const timestampSeconds = parseInt(timestamp, 10);
    if (isNaN(timestampSeconds)) {
      throw new InvalidWebhookSignatureError("Invalid webhook timestamp format");
    }
    const nowSeconds = Math.floor(Date.now() / 1e3);
    if (nowSeconds - timestampSeconds > tolerance) {
      throw new InvalidWebhookSignatureError("Webhook timestamp is too old");
    }
    if (timestampSeconds > nowSeconds + tolerance) {
      throw new InvalidWebhookSignatureError("Webhook timestamp is too new");
    }
    const signatures = signatureHeader.split(" ").map((part) => part.startsWith("v1,") ? part.substring(3) : part);
    const decodedSecret = secret.startsWith("whsec_") ? Buffer.from(secret.replace("whsec_", ""), "base64") : Buffer.from(secret, "utf-8");
    const signedPayload = webhookId ? `${webhookId}.${timestamp}.${payload}` : `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey("raw", decodedSecret, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    for (const signature of signatures) {
      try {
        const signatureBytes = Buffer.from(signature, "base64");
        const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(signedPayload));
        if (isValid) {
          return;
        }
      } catch {
        continue;
      }
    }
    throw new InvalidWebhookSignatureError("The given webhook signature does not match the expected signature");
  }
};
_Webhooks_instances = /* @__PURE__ */ new WeakSet(), _Webhooks_validateSecret = /* @__PURE__ */ __name(function _Webhooks_validateSecret2(secret) {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error(`The webhook secret must either be set using the env var, OPENAI_WEBHOOK_SECRET, on the client class, OpenAI({ webhookSecret: '123' }), or passed to this function`);
  }
}, "_Webhooks_validateSecret"), _Webhooks_getRequiredHeader = /* @__PURE__ */ __name(function _Webhooks_getRequiredHeader2(headers, name) {
  if (!headers) {
    throw new Error(`Headers are required`);
  }
  const value = headers.get(name);
  if (value === null || value === void 0) {
    throw new Error(`Missing required header: ${name}`);
  }
  return value;
}, "_Webhooks_getRequiredHeader");

// node_modules/openai/client.mjs
var _OpenAI_instances;
var _a3;
var _OpenAI_encoder;
var _OpenAI_baseURLOverridden;
var OpenAI = class {
  static {
    __name(this, "OpenAI");
  }
  /**
   * API Client for interfacing with the OpenAI API.
   *
   * @param {string | undefined} [opts.apiKey=process.env['OPENAI_API_KEY'] ?? undefined]
   * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
   * @param {string | null | undefined} [opts.project=process.env['OPENAI_PROJECT_ID'] ?? null]
   * @param {string | null | undefined} [opts.webhookSecret=process.env['OPENAI_WEBHOOK_SECRET'] ?? null]
   * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL'] ?? https://api.openai.com/v1] - Override the default base URL for the API.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({ baseURL = readEnv2("OPENAI_BASE_URL"), apiKey = readEnv2("OPENAI_API_KEY"), organization = readEnv2("OPENAI_ORG_ID") ?? null, project = readEnv2("OPENAI_PROJECT_ID") ?? null, webhookSecret = readEnv2("OPENAI_WEBHOOK_SECRET") ?? null, ...opts } = {}) {
    _OpenAI_instances.add(this);
    _OpenAI_encoder.set(this, void 0);
    this.completions = new Completions2(this);
    this.chat = new Chat(this);
    this.embeddings = new Embeddings(this);
    this.files = new Files3(this);
    this.images = new Images(this);
    this.audio = new Audio(this);
    this.moderations = new Moderations(this);
    this.models = new Models(this);
    this.fineTuning = new FineTuning(this);
    this.graders = new Graders2(this);
    this.vectorStores = new VectorStores(this);
    this.webhooks = new Webhooks(this);
    this.beta = new Beta(this);
    this.batches = new Batches(this);
    this.uploads = new Uploads(this);
    this.responses = new Responses(this);
    this.realtime = new Realtime3(this);
    this.conversations = new Conversations(this);
    this.evals = new Evals(this);
    this.containers = new Containers(this);
    this.skills = new Skills(this);
    this.videos = new Videos(this);
    if (apiKey === void 0) {
      throw new OpenAIError("Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.");
    }
    const options = {
      apiKey,
      organization,
      project,
      webhookSecret,
      ...opts,
      baseURL: baseURL || `https://api.openai.com/v1`
    };
    if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) {
      throw new OpenAIError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew OpenAI({ apiKey, dangerouslyAllowBrowser: true });\n\nhttps://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety\n");
    }
    this.baseURL = options.baseURL;
    this.timeout = options.timeout ?? _a3.DEFAULT_TIMEOUT;
    this.logger = options.logger ?? console;
    const defaultLogLevel = "warn";
    this.logLevel = defaultLogLevel;
    this.logLevel = parseLogLevel2(options.logLevel, "ClientOptions.logLevel", this) ?? parseLogLevel2(readEnv2("OPENAI_LOG"), "process.env['OPENAI_LOG']", this) ?? defaultLogLevel;
    this.fetchOptions = options.fetchOptions;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetch = options.fetch ?? getDefaultFetch2();
    __classPrivateFieldSet2(this, _OpenAI_encoder, FallbackEncoder2, "f");
    this._options = options;
    this.apiKey = typeof apiKey === "string" ? apiKey : "Missing Key";
    this.organization = organization;
    this.project = project;
    this.webhookSecret = webhookSecret;
  }
  /**
   * Create a new client instance re-using the same options given to the current client with optional overriding.
   */
  withOptions(options) {
    const client = new this.constructor({
      ...this._options,
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      organization: this.organization,
      project: this.project,
      webhookSecret: this.webhookSecret,
      ...options
    });
    return client;
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values, nulls }) {
    return;
  }
  async authHeaders(opts) {
    return buildHeaders2([{ Authorization: `Bearer ${this.apiKey}` }]);
  }
  stringifyQuery(query) {
    return stringifyQuery(query);
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${VERSION2}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${uuid42()}`;
  }
  makeStatusError(status, error, message, headers) {
    return APIError2.generate(status, error, message, headers);
  }
  async _callApiKey() {
    const apiKey = this._options.apiKey;
    if (typeof apiKey !== "function")
      return false;
    let token;
    try {
      token = await apiKey();
    } catch (err) {
      if (err instanceof OpenAIError)
        throw err;
      throw new OpenAIError(
        `Failed to get token from 'apiKey' function: ${err.message}`,
        // @ts-ignore
        { cause: err }
      );
    }
    if (typeof token !== "string" || !token) {
      throw new OpenAIError(`Expected 'apiKey' function argument to return a string but it returned ${token}`);
    }
    this.apiKey = token;
    return true;
  }
  buildURL(path4, query, defaultBaseURL) {
    const baseURL = !__classPrivateFieldGet2(this, _OpenAI_instances, "m", _OpenAI_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
    const url = isAbsoluteURL2(path4) ? new URL(path4) : new URL(baseURL + (baseURL.endsWith("/") && path4.startsWith("/") ? path4.slice(1) : path4));
    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj2(defaultQuery)) {
      query = { ...defaultQuery, ...query };
    }
    if (typeof query === "object" && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query);
    }
    return url.toString();
  }
  /**
   * Used as a callback for mutating the given `FinalRequestOptions` object.
   */
  async prepareOptions(options) {
    await this._callApiKey();
  }
  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  async prepareRequest(request, { url, options }) {
  }
  get(path4, opts) {
    return this.methodRequest("get", path4, opts);
  }
  post(path4, opts) {
    return this.methodRequest("post", path4, opts);
  }
  patch(path4, opts) {
    return this.methodRequest("patch", path4, opts);
  }
  put(path4, opts) {
    return this.methodRequest("put", path4, opts);
  }
  delete(path4, opts) {
    return this.methodRequest("delete", path4, opts);
  }
  methodRequest(method, path4, opts) {
    return this.request(Promise.resolve(opts).then((opts2) => {
      return { method, path: path4, ...opts2 };
    }));
  }
  request(options, remainingRetries = null) {
    return new APIPromise2(this, this.makeRequest(options, remainingRetries, void 0));
  }
  async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }
    await this.prepareOptions(options);
    const { req, url, timeout } = await this.buildRequest(options, {
      retryCount: maxRetries - retriesRemaining
    });
    await this.prepareRequest(req, { url, options });
    const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
    const retryLogStr = retryOfRequestLogID === void 0 ? "" : `, retryOf: ${retryOfRequestLogID}`;
    const startTime = Date.now();
    loggerFor2(this).debug(`[${requestLogID}] sending request`, formatRequestDetails2({
      retryOfRequestLogID,
      method: options.method,
      url,
      options,
      headers: req.headers
    }));
    if (options.signal?.aborted) {
      throw new APIUserAbortError2();
    }
    const controller = new AbortController();
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError2);
    const headersTime = Date.now();
    if (response instanceof globalThis.Error) {
      const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
      if (options.signal?.aborted) {
        throw new APIUserAbortError2();
      }
      const isTimeout = isAbortError2(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
      if (retriesRemaining) {
        loggerFor2(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
        loggerFor2(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails2({
          retryOfRequestLogID,
          url,
          durationMs: headersTime - startTime,
          message: response.message
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
      }
      loggerFor2(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
      loggerFor2(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails2({
        retryOfRequestLogID,
        url,
        durationMs: headersTime - startTime,
        message: response.message
      }));
      if (isTimeout) {
        throw new APIConnectionTimeoutError2();
      }
      throw new APIConnectionError2({ cause: response });
    }
    const specialHeaders = [...response.headers.entries()].filter(([name]) => name === "x-request-id").map(([name, value]) => ", " + name + ": " + JSON.stringify(value)).join("");
    const responseInfo = `[${requestLogID}${retryLogStr}${specialHeaders}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
    if (!response.ok) {
      const shouldRetry = await this.shouldRetry(response);
      if (retriesRemaining && shouldRetry) {
        const retryMessage2 = `retrying, ${retriesRemaining} attempts remaining`;
        await CancelReadableStream2(response.body);
        loggerFor2(this).info(`${responseInfo} - ${retryMessage2}`);
        loggerFor2(this).debug(`[${requestLogID}] response error (${retryMessage2})`, formatRequestDetails2({
          retryOfRequestLogID,
          url: response.url,
          status: response.status,
          headers: response.headers,
          durationMs: headersTime - startTime
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
      }
      const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
      loggerFor2(this).info(`${responseInfo} - ${retryMessage}`);
      const errText = await response.text().catch((err2) => castToError2(err2).message);
      const errJSON = safeJSON2(errText);
      const errMessage = errJSON ? void 0 : errText;
      loggerFor2(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails2({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        headers: response.headers,
        message: errMessage,
        durationMs: Date.now() - startTime
      }));
      const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
      throw err;
    }
    loggerFor2(this).info(responseInfo);
    loggerFor2(this).debug(`[${requestLogID}] response start`, formatRequestDetails2({
      retryOfRequestLogID,
      url: response.url,
      status: response.status,
      headers: response.headers,
      durationMs: headersTime - startTime
    }));
    return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
  }
  getAPIList(path4, Page2, opts) {
    return this.requestAPIList(Page2, opts && "then" in opts ? opts.then((opts2) => ({ method: "get", path: path4, ...opts2 })) : { method: "get", path: path4, ...opts });
  }
  requestAPIList(Page2, options) {
    const request = this.makeRequest(options, null, void 0);
    return new PagePromise(this, request, Page2);
  }
  async fetchWithTimeout(url, init, ms, controller) {
    const { signal, method, ...options } = init || {};
    const abort = this._makeAbort(controller);
    if (signal)
      signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, ms);
    const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
    const fetchOptions = {
      signal: controller.signal,
      ...isReadableBody ? { duplex: "half" } : {},
      method: "GET",
      ...options
    };
    if (method) {
      fetchOptions.method = method.toUpperCase();
    }
    try {
      return await this.fetch.call(void 0, url, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }
  }
  async shouldRetry(response) {
    const shouldRetryHeader = response.headers.get("x-should-retry");
    if (shouldRetryHeader === "true")
      return true;
    if (shouldRetryHeader === "false")
      return false;
    if (response.status === 408)
      return true;
    if (response.status === 409)
      return true;
    if (response.status === 429)
      return true;
    if (response.status >= 500)
      return true;
    return false;
  }
  async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
    let timeoutMillis;
    const retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }
    const retryAfterHeader = responseHeaders?.get("retry-after");
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1e3;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }
    if (timeoutMillis === void 0) {
      const maxRetries = options.maxRetries ?? this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep2(timeoutMillis);
    return this.makeRequest(options, retriesRemaining - 1, requestLogID);
  }
  calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 8;
    const numRetries = maxRetries - retriesRemaining;
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
    const jitter = 1 - Math.random() * 0.25;
    return sleepSeconds * jitter * 1e3;
  }
  async buildRequest(inputOptions, { retryCount = 0 } = {}) {
    const options = { ...inputOptions };
    const { method, path: path4, query, defaultBaseURL } = options;
    const url = this.buildURL(path4, query, defaultBaseURL);
    if ("timeout" in options)
      validatePositiveInteger2("timeout", options.timeout);
    options.timeout = options.timeout ?? this.timeout;
    const { bodyHeaders, body } = this.buildBody({ options });
    const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
    const req = {
      method,
      headers: reqHeaders,
      ...options.signal && { signal: options.signal },
      ...globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" },
      ...body && { body },
      ...this.fetchOptions ?? {},
      ...options.fetchOptions ?? {}
    };
    return { req, url, timeout: options.timeout };
  }
  async buildHeaders({ options, method, bodyHeaders, retryCount }) {
    let idempotencyHeaders = {};
    if (this.idempotencyHeader && method !== "get") {
      if (!options.idempotencyKey)
        options.idempotencyKey = this.defaultIdempotencyKey();
      idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
    }
    const headers = buildHeaders2([
      idempotencyHeaders,
      {
        Accept: "application/json",
        "User-Agent": this.getUserAgent(),
        "X-Stainless-Retry-Count": String(retryCount),
        ...options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1e3)) } : {},
        ...getPlatformHeaders2(),
        "OpenAI-Organization": this.organization,
        "OpenAI-Project": this.project
      },
      await this.authHeaders(options),
      this._options.defaultHeaders,
      bodyHeaders,
      options.headers
    ]);
    this.validateHeaders(headers);
    return headers.values;
  }
  _makeAbort(controller) {
    return () => controller.abort();
  }
  buildBody({ options: { body, headers: rawHeaders } }) {
    if (!body) {
      return { bodyHeaders: void 0, body: void 0 };
    }
    const headers = buildHeaders2([rawHeaders]);
    if (
      // Pass raw type verbatim
      ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === "string" && // Preserve legacy string encoding behavior for now
      headers.values.has("content-type") || // `Blob` is superset of `File`
      globalThis.Blob && body instanceof globalThis.Blob || // `FormData` -> `multipart/form-data`
      body instanceof FormData || // `URLSearchParams` -> `application/x-www-form-urlencoded`
      body instanceof URLSearchParams || // Send chunked stream (each chunk has own `length`)
      globalThis.ReadableStream && body instanceof globalThis.ReadableStream
    ) {
      return { bodyHeaders: void 0, body };
    } else if (typeof body === "object" && (Symbol.asyncIterator in body || Symbol.iterator in body && "next" in body && typeof body.next === "function")) {
      return { bodyHeaders: void 0, body: ReadableStreamFrom2(body) };
    } else if (typeof body === "object" && headers.values.get("content-type") === "application/x-www-form-urlencoded") {
      return {
        bodyHeaders: { "content-type": "application/x-www-form-urlencoded" },
        body: this.stringifyQuery(body)
      };
    } else {
      return __classPrivateFieldGet2(this, _OpenAI_encoder, "f").call(this, { body, headers });
    }
  }
};
_a3 = OpenAI, _OpenAI_encoder = /* @__PURE__ */ new WeakMap(), _OpenAI_instances = /* @__PURE__ */ new WeakSet(), _OpenAI_baseURLOverridden = /* @__PURE__ */ __name(function _OpenAI_baseURLOverridden2() {
  return this.baseURL !== "https://api.openai.com/v1";
}, "_OpenAI_baseURLOverridden");
OpenAI.OpenAI = _a3;
OpenAI.DEFAULT_TIMEOUT = 6e5;
OpenAI.OpenAIError = OpenAIError;
OpenAI.APIError = APIError2;
OpenAI.APIConnectionError = APIConnectionError2;
OpenAI.APIConnectionTimeoutError = APIConnectionTimeoutError2;
OpenAI.APIUserAbortError = APIUserAbortError2;
OpenAI.NotFoundError = NotFoundError2;
OpenAI.ConflictError = ConflictError2;
OpenAI.RateLimitError = RateLimitError2;
OpenAI.BadRequestError = BadRequestError2;
OpenAI.AuthenticationError = AuthenticationError2;
OpenAI.InternalServerError = InternalServerError2;
OpenAI.PermissionDeniedError = PermissionDeniedError2;
OpenAI.UnprocessableEntityError = UnprocessableEntityError2;
OpenAI.InvalidWebhookSignatureError = InvalidWebhookSignatureError;
OpenAI.toFile = toFile2;
OpenAI.Completions = Completions2;
OpenAI.Chat = Chat;
OpenAI.Embeddings = Embeddings;
OpenAI.Files = Files3;
OpenAI.Images = Images;
OpenAI.Audio = Audio;
OpenAI.Moderations = Moderations;
OpenAI.Models = Models;
OpenAI.FineTuning = FineTuning;
OpenAI.Graders = Graders2;
OpenAI.VectorStores = VectorStores;
OpenAI.Webhooks = Webhooks;
OpenAI.Beta = Beta;
OpenAI.Batches = Batches;
OpenAI.Uploads = Uploads;
OpenAI.Responses = Responses;
OpenAI.Realtime = Realtime3;
OpenAI.Conversations = Conversations;
OpenAI.Evals = Evals;
OpenAI.Containers = Containers;
OpenAI.Skills = Skills;
OpenAI.Videos = Videos;

// node_modules/openai/azure.mjs
init_esm();

// node_modules/@composio/core/dist/index.mjs
var import_semver = __toESM(require_semver2(), 1);

// node_modules/@composio/core/dist/models/Files.node.mjs
init_esm();
var Files5 = class {
  static {
    __name(this, "Files");
  }
  constructor(client) {
    this.client = client;
    telemetry.instrument(this, "Files");
  }
  /**
  * Upload a file and return the file data.
  *
  * @param params - The upload parameters.
  * @param {File | string} params.file - The path to the file to upload, a URL of the file, or a File object.
  * @param {string} params.toolSlug - The slug of the tool that is uploading the file.
  * @param {string} params.toolkitSlug - The slug of the toolkit that is uploading the file.
  * @returns {Promise<FileUploadData>} The uploaded file data.
  *
  * @example
  *
  * const fileData = await composio.files.upload({
  *   file: 'path/to/file.pdf',
  *   toolSlug: 'google_drive_upload',
  *   toolkitSlug: 'google_drive'
  * });
  * */
  async upload({ file, toolSlug, toolkitSlug }) {
    return await getFileDataAfterUploadingToS3(file, {
      toolSlug,
      toolkitSlug,
      client: this.client
    });
  }
  /**
  * Download a file from S3 and return the file data.
  * @param s3key - The S3 key of the file to download.
  * @returns The file data.
  */
  async download({ toolSlug, s3Url, mimeType }) {
    return await downloadFileFromS3({
      toolSlug,
      s3Url,
      mimeType
    });
  }
};

// node_modules/@composio/json-schema-to-zod/dist/index.mjs
init_esm();
var half = /* @__PURE__ */ __name((arr) => {
  return [arr.slice(0, arr.length / 2), arr.slice(arr.length / 2)];
}, "half");
var originalIndex = Symbol("Original index");
var ensureOriginalIndex = /* @__PURE__ */ __name((arr) => {
  const newArr = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (typeof item === "boolean") newArr.push(item ? { [originalIndex]: i } : {
      [originalIndex]: i,
      not: {}
    });
    else if (originalIndex in item) return arr;
    else newArr.push({
      ...item,
      [originalIndex]: i
    });
  }
  return newArr;
}, "ensureOriginalIndex");
function parseAllOf(jsonSchema, refs) {
  if (jsonSchema.allOf.length === 0) return external_exports.never();
  if (jsonSchema.allOf.length === 1) {
    const item = jsonSchema.allOf[0];
    return parseSchema(item, {
      ...refs,
      path: [
        ...refs.path,
        "allOf",
        item[originalIndex]
      ]
    });
  }
  const [left, right] = half(ensureOriginalIndex(jsonSchema.allOf));
  return external_exports.intersection(parseAllOf({ allOf: left }, refs), parseAllOf({ allOf: right }, refs));
}
__name(parseAllOf, "parseAllOf");
var parseAnyOf = /* @__PURE__ */ __name((jsonSchema, refs) => {
  return jsonSchema.anyOf.length ? jsonSchema.anyOf.length === 1 ? parseSchema(jsonSchema.anyOf[0], {
    ...refs,
    path: [
      ...refs.path,
      "anyOf",
      0
    ]
  }) : external_exports.union(jsonSchema.anyOf.map((schema, i) => parseSchema(schema, {
    ...refs,
    path: [
      ...refs.path,
      "anyOf",
      i
    ]
  }))) : external_exports.any();
}, "parseAnyOf");
function extendSchemaWithMessage(zodSchema, jsonSchema, key, extend) {
  const value = jsonSchema[key];
  if (value !== void 0) {
    const errorMessage = jsonSchema.errorMessage?.[key];
    return extend(zodSchema, value, errorMessage);
  }
  return zodSchema;
}
__name(extendSchemaWithMessage, "extendSchemaWithMessage");
var its = {
  an: {
    object: /* @__PURE__ */ __name((x) => x.type === "object" || !x.type && (x.properties !== void 0 || x.additionalProperties !== void 0 || x.patternProperties !== void 0), "object"),
    array: /* @__PURE__ */ __name((x) => x.type === "array", "array"),
    anyOf: /* @__PURE__ */ __name((x) => x.anyOf !== void 0, "anyOf"),
    allOf: /* @__PURE__ */ __name((x) => x.allOf !== void 0, "allOf"),
    enum: /* @__PURE__ */ __name((x) => x.enum !== void 0, "enum")
  },
  a: {
    nullable: /* @__PURE__ */ __name((x) => x.nullable === true, "nullable"),
    multipleType: /* @__PURE__ */ __name((x) => Array.isArray(x.type), "multipleType"),
    not: /* @__PURE__ */ __name((x) => x.not !== void 0, "not"),
    const: /* @__PURE__ */ __name((x) => x.const !== void 0, "const"),
    primitive: /* @__PURE__ */ __name((x, p) => x.type === p, "primitive"),
    conditional: /* @__PURE__ */ __name((x) => Boolean("if" in x && x.if && "then" in x && "else" in x && x.then && x.else), "conditional"),
    oneOf: /* @__PURE__ */ __name((x) => x.oneOf !== void 0, "oneOf")
  }
};
var parseArray = /* @__PURE__ */ __name((jsonSchema, refs) => {
  if (its.an.anyOf(jsonSchema)) {
    const types = /* @__PURE__ */ new Set();
    const itemsSchemas = [];
    jsonSchema.anyOf.forEach((option) => {
      if (typeof option === "object" && option.type) types.add(typeof option.type === "string" ? option.type : option.type[0]);
      if (typeof option === "object" && option.items) {
        const optionItems = option.items;
        if (!Array.isArray(optionItems) && typeof optionItems === "object") itemsSchemas.push(optionItems);
      }
    });
    let finalItems;
    if (itemsSchemas.length === 1) finalItems = itemsSchemas[0];
    else if (itemsSchemas.length > 1) finalItems = { anyOf: itemsSchemas };
    const newSchema = {
      ...types.size > 0 ? { type: Array.from(types) } : { type: "array" },
      ...finalItems && { items: finalItems }
    };
    [
      "default",
      "description",
      "examples",
      "title"
    ].forEach((field) => {
      const value = jsonSchema[field];
      if (value !== void 0) newSchema[field] = value;
    });
    return parseSchema(newSchema, refs);
  }
  if (Array.isArray(jsonSchema.items)) return external_exports.tuple(jsonSchema.items.map((v, i) => parseSchema(v, {
    ...refs,
    path: [
      ...refs.path,
      "items",
      i
    ]
  })));
  let zodSchema = !jsonSchema.items ? external_exports.array(external_exports.any()) : external_exports.array(parseSchema(jsonSchema.items, {
    ...refs,
    path: [...refs.path, "items"]
  }));
  zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "minItems", (zs, minItems, errorMessage) => zs.min(minItems, errorMessage));
  zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "maxItems", (zs, maxItems, errorMessage) => zs.max(maxItems, errorMessage));
  if (typeof jsonSchema.min === "number" && typeof jsonSchema.minItems !== "number") zodSchema = extendSchemaWithMessage(zodSchema, {
    ...jsonSchema,
    minItems: jsonSchema.min
  }, "minItems", (zs, minItems, errorMessage) => zs.min(minItems, errorMessage));
  if (typeof jsonSchema.max === "number" && typeof jsonSchema.maxItems !== "number") zodSchema = extendSchemaWithMessage(zodSchema, {
    ...jsonSchema,
    maxItems: jsonSchema.max
  }, "maxItems", (zs, maxItems, errorMessage) => zs.max(maxItems, errorMessage));
  return zodSchema;
}, "parseArray");
var parseBoolean = /* @__PURE__ */ __name((_jsonSchema) => {
  return external_exports.boolean();
}, "parseBoolean");
var parseConst = /* @__PURE__ */ __name((jsonSchema) => {
  return external_exports.literal(jsonSchema.const);
}, "parseConst");
var parseDefault = /* @__PURE__ */ __name((_jsonSchema) => {
  return external_exports.any();
}, "parseDefault");
var parseEnum = /* @__PURE__ */ __name((jsonSchema) => {
  if (jsonSchema.enum.length === 0) return external_exports.never();
  if (jsonSchema.enum.length === 1) return external_exports.literal(jsonSchema.enum[0]);
  if (jsonSchema.enum.every((x) => typeof x === "string")) return external_exports.enum(jsonSchema.enum);
  return external_exports.union(jsonSchema.enum.map((x) => external_exports.literal(x)));
}, "parseEnum");
var parseIfThenElse = /* @__PURE__ */ __name((jsonSchema, refs) => {
  const $if = parseSchema(jsonSchema.if, {
    ...refs,
    path: [...refs.path, "if"]
  });
  const $then = parseSchema(jsonSchema.then, {
    ...refs,
    path: [...refs.path, "then"]
  });
  const $else = parseSchema(jsonSchema.else, {
    ...refs,
    path: [...refs.path, "else"]
  });
  return external_exports.union([$then, $else]).superRefine((value, ctx) => {
    const result = $if.safeParse(value).success ? $then.safeParse(value) : $else.safeParse(value);
    if (!result.success) result.error.errors.forEach((error) => ctx.addIssue(error));
  });
}, "parseIfThenElse");
var parseMultipleType = /* @__PURE__ */ __name((jsonSchema, refs) => {
  return external_exports.union(jsonSchema.type.map((type) => parseSchema({
    ...jsonSchema,
    type
  }, refs)));
}, "parseMultipleType");
var parseNot = /* @__PURE__ */ __name((jsonSchema, refs) => {
  return external_exports.any().refine((value) => !parseSchema(jsonSchema.not, {
    ...refs,
    path: [...refs.path, "not"]
  }).safeParse(value).success, "Invalid input: Should NOT be valid against schema");
}, "parseNot");
var parseNull = /* @__PURE__ */ __name((_jsonSchema) => {
  return external_exports.null();
}, "parseNull");
var omit = /* @__PURE__ */ __name((obj, ...keys) => Object.keys(obj).reduce((acc, key) => {
  if (!keys.includes(key)) acc[key] = obj[key];
  return acc;
}, {}), "omit");
var parseNullable = /* @__PURE__ */ __name((jsonSchema, refs) => {
  const hasNullDefault = jsonSchema.default === null;
  const zodSchema = parseSchema(hasNullDefault ? omit(omit(jsonSchema, "nullable"), "default") : omit(jsonSchema, "nullable"), refs, true).nullable();
  return hasNullDefault ? zodSchema.default(null) : zodSchema;
}, "parseNullable");
var parseNumber = /* @__PURE__ */ __name((jsonSchema) => {
  let zodSchema = external_exports.number();
  let isInteger = false;
  if (jsonSchema.type === "integer") {
    isInteger = true;
    zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "type", (zs, _, errorMsg) => zs.int(errorMsg));
  } else if (jsonSchema.format === "int64") {
    isInteger = true;
    zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "format", (zs, _, errorMsg) => zs.int(errorMsg));
  }
  zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "multipleOf", (zs, multipleOf, errorMsg) => {
    if (multipleOf === 1) {
      if (isInteger) return zs;
      return zs.int(errorMsg);
    }
    return zs.multipleOf(multipleOf, errorMsg);
  });
  if (typeof jsonSchema.minimum === "number") if (jsonSchema.exclusiveMinimum === true) zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "minimum", (zs, minimum, errorMsg) => zs.gt(minimum, errorMsg));
  else zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "minimum", (zs, minimum, errorMsg) => zs.gte(minimum, errorMsg));
  else if (typeof jsonSchema.exclusiveMinimum === "number") zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "exclusiveMinimum", (zs, exclusiveMinimum, errorMsg) => zs.gt(exclusiveMinimum, errorMsg));
  if (typeof jsonSchema.maximum === "number") if (jsonSchema.exclusiveMaximum === true) zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "maximum", (zs, maximum, errorMsg) => zs.lt(maximum, errorMsg));
  else zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "maximum", (zs, maximum, errorMsg) => zs.lte(maximum, errorMsg));
  else if (typeof jsonSchema.exclusiveMaximum === "number") zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "exclusiveMaximum", (zs, exclusiveMaximum, errorMsg) => zs.lt(exclusiveMaximum, errorMsg));
  if (typeof jsonSchema.min === "number" && typeof jsonSchema.minimum !== "number") zodSchema = extendSchemaWithMessage(zodSchema, {
    ...jsonSchema,
    minimum: jsonSchema.min
  }, "minimum", (zs, minimum, errorMsg) => zs.gte(minimum, errorMsg));
  if (typeof jsonSchema.max === "number" && typeof jsonSchema.maximum !== "number") zodSchema = extendSchemaWithMessage(zodSchema, {
    ...jsonSchema,
    maximum: jsonSchema.max
  }, "maximum", (zs, maximum, errorMsg) => zs.lte(maximum, errorMsg));
  return zodSchema;
}, "parseNumber");
var parseOneOf = /* @__PURE__ */ __name((jsonSchema, refs) => {
  if (!jsonSchema.oneOf.length) return external_exports.any();
  if (jsonSchema.oneOf.length === 1) return parseSchema(jsonSchema.oneOf[0], {
    ...refs,
    path: [
      ...refs.path,
      "oneOf",
      0
    ]
  });
  return external_exports.any().superRefine((x, ctx) => {
    const schemas = jsonSchema.oneOf.map((schema, i) => parseSchema(schema, {
      ...refs,
      path: [
        ...refs.path,
        "oneOf",
        i
      ]
    }));
    const unionErrors = schemas.reduce((errors, schema) => ((result) => result.error ? [...errors, result.error] : errors)(schema.safeParse(x)), []);
    if (schemas.length - unionErrors.length !== 1) ctx.addIssue({
      path: ctx.path,
      code: "invalid_union",
      unionErrors,
      message: "Invalid input: Should pass single schema"
    });
  });
}, "parseOneOf");
function parseObjectProperties(objectSchema, refs) {
  if (!objectSchema.properties) return objectType({});
  const propertyKeys = Object.keys(objectSchema.properties);
  if (propertyKeys.length === 0) return objectType({});
  const properties = {};
  for (const key of propertyKeys) {
    const propJsonSchema = objectSchema.properties[key];
    const propZodSchema = parseSchema(propJsonSchema, {
      ...refs,
      path: [
        ...refs.path,
        "properties",
        key
      ]
    });
    const required = Array.isArray(objectSchema.required) ? objectSchema.required.includes(key) : false;
    if (!required && propJsonSchema && typeof propJsonSchema === "object" && "default" in propJsonSchema) if (propJsonSchema.default === null) {
      const hasAnyOfWithNull = propJsonSchema.anyOf && Array.isArray(propJsonSchema.anyOf) && propJsonSchema.anyOf.some((schema) => typeof schema === "object" && schema !== null && schema.type === "null");
      const hasOneOfWithNull = propJsonSchema.oneOf && Array.isArray(propJsonSchema.oneOf) && propJsonSchema.oneOf.some((schema) => typeof schema === "object" && schema !== null && schema.type === "null");
      const isNullable = "nullable" in propJsonSchema && propJsonSchema.nullable === true;
      if (hasAnyOfWithNull || hasOneOfWithNull || isNullable) properties[key] = propZodSchema.optional().default(null);
      else properties[key] = propZodSchema.nullable().optional().default(null);
    } else properties[key] = propZodSchema.optional().default(propJsonSchema.default);
    else properties[key] = required ? propZodSchema : propZodSchema.optional();
  }
  return objectType(properties);
}
__name(parseObjectProperties, "parseObjectProperties");
function parseObject(objectSchema, refs) {
  const hasPatternProperties = Object.keys(objectSchema.patternProperties ?? {}).length > 0;
  const normalizedSchema = objectSchema.type === "object" ? objectSchema : {
    ...objectSchema,
    type: "object"
  };
  const propertiesSchema = parseObjectProperties(normalizedSchema, refs);
  let zodSchema = propertiesSchema;
  const additionalProperties = normalizedSchema.additionalProperties !== void 0 ? parseSchema(normalizedSchema.additionalProperties, {
    ...refs,
    path: [...refs.path, "additionalProperties"]
  }) : void 0;
  const isAdditionalPropertiesTrue = normalizedSchema.additionalProperties === true;
  if (normalizedSchema.patternProperties) {
    const parsedPatternProperties = Object.fromEntries(Object.entries(normalizedSchema.patternProperties).map(([key, value]) => {
      return [key, parseSchema(value, {
        ...refs,
        path: [
          ...refs.path,
          "patternProperties",
          key
        ]
      })];
    }));
    const patternPropertyValues = Object.values(parsedPatternProperties);
    if (propertiesSchema) if (additionalProperties) zodSchema = propertiesSchema.catchall(unionType([...patternPropertyValues, additionalProperties]));
    else if (Object.keys(parsedPatternProperties).length > 1) zodSchema = propertiesSchema.catchall(unionType(patternPropertyValues));
    else zodSchema = propertiesSchema.catchall(patternPropertyValues[0]);
    else if (additionalProperties) zodSchema = recordType(unionType([...patternPropertyValues, additionalProperties]));
    else if (patternPropertyValues.length > 1) zodSchema = recordType(unionType(patternPropertyValues));
    else zodSchema = recordType(patternPropertyValues[0]);
    const objectPropertyKeys = new Set(Object.keys(normalizedSchema.properties ?? {}));
    zodSchema = zodSchema.superRefine((value, ctx) => {
      for (const key in value) {
        let wasMatched = objectPropertyKeys.has(key);
        for (const patternPropertyKey in normalizedSchema.patternProperties) {
          const regex = new RegExp(patternPropertyKey);
          if (key.match(regex)) {
            wasMatched = true;
            const result = parsedPatternProperties[patternPropertyKey].safeParse(value[key]);
            if (!result.success) ctx.addIssue({
              path: [...ctx.path, key],
              code: "custom",
              message: `Invalid input: Key matching regex /${key}/ must match schema`,
              params: { issues: result.error.issues }
            });
          }
        }
        if (!wasMatched && additionalProperties) {
          const result = additionalProperties.safeParse(value[key]);
          if (!result.success) ctx.addIssue({
            path: [...ctx.path, key],
            code: "custom",
            message: "Invalid input: must match catchall schema",
            params: { issues: result.error.issues }
          });
        }
      }
    });
  }
  let output;
  if (propertiesSchema) if (hasPatternProperties) output = zodSchema;
  else if (additionalProperties) if (additionalProperties instanceof ZodNever) output = propertiesSchema.strict();
  else if (isAdditionalPropertiesTrue) output = propertiesSchema.passthrough();
  else output = propertiesSchema.catchall(additionalProperties);
  else output = propertiesSchema.strict();
  else if (hasPatternProperties) output = zodSchema;
  else if (additionalProperties) if (additionalProperties instanceof ZodNever) output = objectType({}).strict();
  else if (isAdditionalPropertiesTrue) output = objectType({}).passthrough();
  else output = recordType(additionalProperties);
  else output = objectType({}).passthrough();
  if (its.an.anyOf(objectSchema)) output = output.and(parseAnyOf({
    ...objectSchema,
    anyOf: objectSchema.anyOf.map((x) => typeof x === "object" && !x.type && (x.properties ?? x.additionalProperties ?? x.patternProperties) ? {
      ...x,
      type: "object"
    } : x)
  }, refs));
  if (its.a.oneOf(objectSchema)) output = output.and(parseOneOf({
    ...objectSchema,
    oneOf: objectSchema.oneOf.map((x) => typeof x === "object" && !x.type && (x.properties ?? x.additionalProperties ?? x.patternProperties) ? {
      ...x,
      type: "object"
    } : x)
  }, refs));
  if (its.an.allOf(objectSchema)) output = output.and(parseAllOf({
    ...objectSchema,
    allOf: objectSchema.allOf.map((x) => typeof x === "object" && !x.type && (x.properties ?? x.additionalProperties ?? x.patternProperties) ? {
      ...x,
      type: "object"
    } : x)
  }, refs));
  return output;
}
__name(parseObject, "parseObject");
var parseString = /* @__PURE__ */ __name((jsonSchema) => {
  let zodSchema = external_exports.string();
  zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "format", (zs, format, errorMsg) => {
    switch (format) {
      case "email":
        return zs.email(errorMsg);
      case "ip":
        return zs.ip(errorMsg);
      case "ipv4":
        return zs.ip({
          version: "v4",
          message: errorMsg
        });
      case "ipv6":
        return zs.ip({
          version: "v6",
          message: errorMsg
        });
      case "uri":
        return zs.url(errorMsg);
      case "uuid":
        return zs.uuid(errorMsg);
      case "date-time":
        return zs.datetime({
          offset: true,
          message: errorMsg
        });
      case "time":
        return zs.time(errorMsg);
      case "date":
        return zs.date(errorMsg);
      case "binary":
        return zs.base64(errorMsg);
      case "duration":
        return zs.duration(errorMsg);
      default:
        return zs;
    }
  });
  zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "contentEncoding", (zs, _, errorMsg) => zs.base64(errorMsg));
  zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "pattern", (zs, pattern, errorMsg) => zs.regex(new RegExp(pattern), errorMsg));
  zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "minLength", (zs, minLength, errorMsg) => zs.min(minLength, errorMsg));
  zodSchema = extendSchemaWithMessage(zodSchema, jsonSchema, "maxLength", (zs, maxLength, errorMsg) => zs.max(maxLength, errorMsg));
  if (typeof jsonSchema.min === "number" && typeof jsonSchema.minLength !== "number") zodSchema = extendSchemaWithMessage(zodSchema, {
    ...jsonSchema,
    minLength: jsonSchema.min
  }, "minLength", (zs, minLength, errorMsg) => zs.min(minLength, errorMsg));
  if (typeof jsonSchema.max === "number" && typeof jsonSchema.maxLength !== "number") zodSchema = extendSchemaWithMessage(zodSchema, {
    ...jsonSchema,
    maxLength: jsonSchema.max
  }, "maxLength", (zs, maxLength, errorMsg) => zs.max(maxLength, errorMsg));
  return zodSchema;
}, "parseString");
var addDescribes = /* @__PURE__ */ __name((jsonSchema, zodSchema) => {
  let description = "";
  if (jsonSchema.description) description = jsonSchema.description;
  else if (jsonSchema.title) description = jsonSchema.title;
  if (jsonSchema.example !== void 0) {
    const exampleText = `Example: ${JSON.stringify(jsonSchema.example)}`;
    description = description ? `${description}
${exampleText}` : exampleText;
  } else if (jsonSchema.examples !== void 0 && Array.isArray(jsonSchema.examples)) {
    const examples = jsonSchema.examples;
    if (examples && examples.length && examples.length > 0) {
      const exampleText = examples.length === 1 ? `Example: ${JSON.stringify(examples[0])}` : `Examples:
${examples.map((ex) => `  ${JSON.stringify(ex)}`).join("\n")}`;
      description = description ? `${description}
${exampleText}` : exampleText;
    }
  }
  if (description) zodSchema = zodSchema.describe(description);
  return zodSchema;
}, "addDescribes");
var addDefaults = /* @__PURE__ */ __name((jsonSchema, zodSchema, refs) => {
  if (jsonSchema.default !== void 0) {
    if (jsonSchema.default === null) {
      if (refs?.path.some((segment) => segment === "anyOf" || segment === "oneOf") && jsonSchema.type && jsonSchema.type !== "null" && !jsonSchema.nullable) return zodSchema;
    }
    zodSchema = zodSchema.default(jsonSchema.default);
  }
  return zodSchema;
}, "addDefaults");
var addAnnotations = /* @__PURE__ */ __name((jsonSchema, zodSchema) => {
  if (jsonSchema.readOnly) zodSchema = zodSchema.readonly();
  return zodSchema;
}, "addAnnotations");
var selectParser2 = /* @__PURE__ */ __name((schema, refs) => {
  if (its.a.nullable(schema)) return parseNullable(schema, refs);
  else if (its.an.object(schema)) return parseObject(schema, refs);
  else if (its.an.array(schema)) return parseArray(schema, refs);
  else if (its.an.anyOf(schema)) return parseAnyOf(schema, refs);
  else if (its.an.allOf(schema)) return parseAllOf(schema, refs);
  else if (its.a.oneOf(schema)) return parseOneOf(schema, refs);
  else if (its.a.not(schema)) return parseNot(schema, refs);
  else if (its.an.enum(schema)) return parseEnum(schema);
  else if (its.a.const(schema)) return parseConst(schema);
  else if (its.a.multipleType(schema)) return parseMultipleType(schema, refs);
  else if (its.a.primitive(schema, "string")) return parseString(schema);
  else if (its.a.primitive(schema, "number") || its.a.primitive(schema, "integer")) return parseNumber(schema);
  else if (its.a.primitive(schema, "boolean")) return parseBoolean(schema);
  else if (its.a.primitive(schema, "null")) return parseNull(schema);
  else if (its.a.conditional(schema)) return parseIfThenElse(schema, refs);
  else return parseDefault(schema);
}, "selectParser");
var parseSchema = /* @__PURE__ */ __name((jsonSchema, refs = {
  seen: /* @__PURE__ */ new Map(),
  path: []
}, blockMeta) => {
  if (typeof jsonSchema !== "object") return jsonSchema ? anyType() : neverType();
  if (refs.parserOverride) {
    const custom = refs.parserOverride(jsonSchema, refs);
    if (custom instanceof ZodType) return custom;
  }
  let seen = refs.seen.get(jsonSchema);
  if (seen) {
    if (seen.r !== void 0) return seen.r;
    if (refs.depth === void 0 || seen.n >= refs.depth) return anyType();
    seen.n += 1;
  } else {
    seen = {
      r: void 0,
      n: 0
    };
    refs.seen.set(jsonSchema, seen);
  }
  let parsedZodSchema = selectParser2(jsonSchema, refs);
  if (!blockMeta) {
    if (!refs.withoutDescribes) parsedZodSchema = addDescribes(jsonSchema, parsedZodSchema);
    if (!refs.withoutDefaults) parsedZodSchema = addDefaults(jsonSchema, parsedZodSchema, refs);
    parsedZodSchema = addAnnotations(jsonSchema, parsedZodSchema);
  }
  seen.r = parsedZodSchema;
  return parsedZodSchema;
}, "parseSchema");
var jsonSchemaToZod = /* @__PURE__ */ __name((schema, options = {}) => {
  return parseSchema(schema, {
    path: [],
    seen: /* @__PURE__ */ new Map(),
    ...options
  });
}, "jsonSchemaToZod");

// node_modules/@composio/core/dist/index.mjs
var AuthConfigTypes = {
  CUSTOM: "use_custom_auth",
  COMPOSIO_MANAGED: "use_composio_managed_auth"
};
var AuthSchemeTypes = {
  OAUTH1: "OAUTH1",
  OAUTH2: "OAUTH2",
  API_KEY: "API_KEY",
  BASIC: "BASIC",
  BEARER_TOKEN: "BEARER_TOKEN",
  BILLCOM_AUTH: "BILLCOM_AUTH",
  GOOGLE_SERVICE_ACCOUNT: "GOOGLE_SERVICE_ACCOUNT",
  NO_AUTH: "NO_AUTH",
  BASIC_WITH_JWT: "BASIC_WITH_JWT",
  CALCOM_AUTH: "CALCOM_AUTH",
  SERVICE_ACCOUNT: "SERVICE_ACCOUNT",
  SAML: "SAML",
  DCR_OAUTH: "DCR_OAUTH",
  S2S_OAUTH2: "S2S_OAUTH2"
};
var AuthConfigCreationToolAccessConfigSchema = external_exports.object({ toolsForConnectedAccountCreation: external_exports.array(external_exports.string()).optional() });
var AuthConfigToolAccessConfigSchema = external_exports.object({
  toolsAvailableForExecution: external_exports.array(external_exports.string()).optional(),
  toolsForConnectedAccountCreation: external_exports.array(external_exports.string()).optional()
});
var AuthSchemeEnum = external_exports.enum([
  "OAUTH2",
  "OAUTH1",
  "API_KEY",
  "BASIC",
  "BILLCOM_AUTH",
  "BEARER_TOKEN",
  "GOOGLE_SERVICE_ACCOUNT",
  "NO_AUTH",
  "BASIC_WITH_JWT",
  "CALCOM_AUTH",
  "SERVICE_ACCOUNT",
  "SAML",
  "DCR_OAUTH",
  "S2S_OAUTH2"
]);
var CreateCustomAuthConfigParamsSchema = external_exports.object({
  type: external_exports.literal("use_custom_auth"),
  name: external_exports.string().optional(),
  credentials: external_exports.record(external_exports.string(), external_exports.union([
    external_exports.string(),
    external_exports.number(),
    external_exports.boolean()
  ])),
  authScheme: AuthSchemeEnum,
  proxyConfig: external_exports.object({
    proxyUrl: external_exports.string(),
    proxyAuthKey: external_exports.string().optional()
  }).optional(),
  toolAccessConfig: AuthConfigCreationToolAccessConfigSchema.optional(),
  isEnabledForToolRouter: external_exports.boolean().optional()
});
var CreateComposioManagedAuthConfigParamsSchema = external_exports.object({
  type: external_exports.literal("use_composio_managed_auth"),
  name: external_exports.string().optional(),
  credentials: external_exports.object({
    scopes: external_exports.union([external_exports.string(), external_exports.array(external_exports.string())]).optional(),
    user_scopes: external_exports.union([external_exports.string(), external_exports.array(external_exports.string())]).optional()
  }).passthrough().optional(),
  toolAccessConfig: AuthConfigCreationToolAccessConfigSchema.optional(),
  isEnabledForToolRouter: external_exports.boolean().optional()
});
var CreateAuthConfigParamsSchema = external_exports.discriminatedUnion("type", [CreateCustomAuthConfigParamsSchema, CreateComposioManagedAuthConfigParamsSchema]);
var CreateAuthConfigResponseSchema = external_exports.object({
  id: external_exports.string(),
  authScheme: external_exports.string(),
  isComposioManaged: external_exports.boolean(),
  toolkit: external_exports.string()
});
var AuthConfigRetrieveResponseSchema = external_exports.object({
  id: external_exports.string(),
  name: external_exports.string(),
  toolkit: external_exports.object({
    logo: external_exports.string(),
    slug: external_exports.string()
  }),
  noOfConnections: external_exports.number(),
  status: external_exports.enum(["ENABLED", "DISABLED"]),
  uuid: external_exports.string(),
  authScheme: AuthSchemeEnum.optional(),
  credentials: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
  expectedInputFields: external_exports.array(external_exports.unknown()).optional(),
  isEnabledForToolRouter: external_exports.boolean().optional(),
  restrictToFollowingTools: external_exports.array(external_exports.string()).optional(),
  isComposioManaged: external_exports.boolean().optional(),
  createdBy: external_exports.string().optional(),
  createdAt: external_exports.string().optional(),
  lastUpdatedAt: external_exports.string().optional(),
  toolAccessConfig: AuthConfigToolAccessConfigSchema.optional()
});
var AuthConfigListParamsSchema = external_exports.object({
  cursor: external_exports.string().optional(),
  isComposioManaged: external_exports.boolean().optional(),
  limit: external_exports.number().optional(),
  toolkit: external_exports.string().optional()
});
var AuthConfigListResponseSchema = external_exports.object({
  items: external_exports.array(AuthConfigRetrieveResponseSchema),
  nextCursor: external_exports.string().nullable(),
  totalPages: external_exports.number()
});
var AuthCustomConfigUpdateParamsSchema = external_exports.object({
  type: external_exports.literal("custom"),
  credentials: external_exports.object({
    scopes: external_exports.union([external_exports.string(), external_exports.array(external_exports.string())]).optional(),
    user_scopes: external_exports.union([external_exports.string(), external_exports.array(external_exports.string())]).optional()
  }).passthrough().optional(),
  isEnabledForToolRouter: external_exports.boolean().optional(),
  restrictToFollowingTools: external_exports.array(external_exports.string()).optional(),
  toolAccessConfig: AuthConfigToolAccessConfigSchema.optional()
});
var AuthDefaultConfigUpdateParamsSchema = external_exports.object({
  type: external_exports.literal("default"),
  scopes: external_exports.string().optional(),
  isEnabledForToolRouter: external_exports.boolean().optional(),
  restrictToFollowingTools: external_exports.array(external_exports.string()).optional(),
  toolAccessConfig: AuthConfigToolAccessConfigSchema.optional()
});
var AuthConfigUpdateParamsSchema = external_exports.discriminatedUnion("type", [AuthCustomConfigUpdateParamsSchema, AuthDefaultConfigUpdateParamsSchema]);
var ConnectionStatuses = {
  INITIALIZING: "INITIALIZING",
  INITIATED: "INITIATED",
  ACTIVE: "ACTIVE",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
  INACTIVE: "INACTIVE"
};
var RedirectableAuthSchemeSchema = external_exports.enum([AuthSchemeTypes.OAUTH1, AuthSchemeTypes.OAUTH2]);
var BaseSchemeRaw = external_exports.object({
  subdomain: external_exports.string().optional(),
  ["your-domain"]: external_exports.string().optional(),
  region: external_exports.string().optional(),
  shop: external_exports.string().optional(),
  account_url: external_exports.string().optional(),
  COMPANYDOMAIN: external_exports.string().optional(),
  extension: external_exports.string().optional(),
  form_api_base_url: external_exports.string().optional(),
  instanceEndpoint: external_exports.string().optional(),
  api_url: external_exports.string().optional(),
  borneo_dashboard_url: external_exports.string().optional(),
  proxy_username: external_exports.string().optional(),
  proxy_password: external_exports.string().optional(),
  domain: external_exports.string().optional(),
  version: external_exports.string().optional(),
  dc: external_exports.string().optional(),
  site_name: external_exports.string().optional(),
  instanceName: external_exports.string().optional(),
  account_id: external_exports.string().optional(),
  your_server: external_exports.string().optional(),
  server_location: external_exports.string().optional(),
  base_url: external_exports.string().optional(),
  api_key: external_exports.string().optional(),
  generic_api_key: external_exports.string().optional(),
  bearer_token: external_exports.string().optional(),
  basic_encoded: external_exports.string().optional(),
  long_redirect_url: external_exports.boolean().optional(),
  state_prefix: external_exports.string().optional(),
  registration_access_token: external_exports.string().optional(),
  registration_client_uri: external_exports.string().optional(),
  composio_link_redirect_url: external_exports.string().optional()
}).catchall(external_exports.unknown());
var Oauth2InitiatingConnectionDataSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var Oauth2InitiatedConnectionDataSchema = Oauth2InitiatingConnectionDataSchema.extend({
  status: external_exports.literal(ConnectionStatuses.INITIATED),
  code_verifier: external_exports.string().optional(),
  redirectUrl: external_exports.string(),
  callback_url: external_exports.string().optional(),
  finalRedirectUri: external_exports.string().optional(),
  webhook_signature: external_exports.string().optional()
}).catchall(external_exports.unknown());
var Oauth2ActiveConnectionDataSchema = Oauth2InitiatingConnectionDataSchema.extend({
  status: external_exports.literal(ConnectionStatuses.ACTIVE),
  access_token: external_exports.string(),
  id_token: external_exports.string().optional(),
  token_type: external_exports.string().optional(),
  refresh_token: external_exports.string().nullish(),
  expires_in: external_exports.union([
    external_exports.string(),
    external_exports.number(),
    external_exports.null()
  ]).optional(),
  scope: external_exports.union([
    external_exports.string(),
    external_exports.array(external_exports.string()),
    external_exports.null()
  ]).optional(),
  webhook_signature: external_exports.string().optional(),
  authed_user: external_exports.object({
    access_token: external_exports.string().optional(),
    scope: external_exports.string().optional()
  }).optional().describe("for slack user scopes")
}).catchall(external_exports.unknown());
var Oauth2FailedConnectionDataSchema = Oauth2InitiatingConnectionDataSchema.extend({
  status: external_exports.literal(ConnectionStatuses.FAILED),
  error: external_exports.string().optional(),
  error_description: external_exports.string().optional()
}).catchall(external_exports.unknown());
var Oauth2ExpiredConnectionDataSchema = Oauth2InitiatingConnectionDataSchema.extend({
  status: external_exports.literal(ConnectionStatuses.EXPIRED),
  expired_at: external_exports.string().optional()
}).catchall(external_exports.unknown());
var Oauth2InactiveConnectionDataSchema = Oauth2InitiatingConnectionDataSchema.extend({
  status: external_exports.literal(ConnectionStatuses.INACTIVE),
  access_token: external_exports.string(),
  id_token: external_exports.string().optional(),
  token_type: external_exports.string().optional(),
  refresh_token: external_exports.string().nullish(),
  expires_in: external_exports.union([
    external_exports.string(),
    external_exports.number(),
    external_exports.null()
  ]).optional(),
  scope: external_exports.union([
    external_exports.string(),
    external_exports.array(external_exports.string()),
    external_exports.null()
  ]).optional(),
  webhook_signature: external_exports.string().optional(),
  authed_user: external_exports.object({
    access_token: external_exports.string().optional(),
    scope: external_exports.string().optional()
  }).optional().describe("for slack user scopes")
}).catchall(external_exports.unknown());
var Oauth2ConnectionDataSchema = external_exports.discriminatedUnion("status", [
  Oauth2InitiatingConnectionDataSchema,
  Oauth2InitiatedConnectionDataSchema,
  Oauth2ActiveConnectionDataSchema,
  Oauth2FailedConnectionDataSchema,
  Oauth2ExpiredConnectionDataSchema,
  Oauth2InactiveConnectionDataSchema
]);
var CustomOauth2ConnectionDataSchema = Oauth2ActiveConnectionDataSchema.omit({ status: true });
var S2SOauth2BaseSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var S2SOauth2ConnectionDataSchema = external_exports.discriminatedUnion("status", [
  S2SOauth2BaseSchema,
  S2SOauth2BaseSchema.extend({ status: external_exports.literal(ConnectionStatuses.INITIATED) }).catchall(external_exports.unknown()),
  S2SOauth2BaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.ACTIVE),
    access_token: external_exports.string().optional(),
    id_token: external_exports.string().optional(),
    token_type: external_exports.string().optional(),
    refresh_token: external_exports.string().nullish(),
    expires_in: external_exports.union([
      external_exports.string(),
      external_exports.number(),
      external_exports.null()
    ]).optional(),
    scope: external_exports.union([
      external_exports.string(),
      external_exports.array(external_exports.string()),
      external_exports.null()
    ]).optional()
  }).catchall(external_exports.unknown()),
  S2SOauth2BaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.INACTIVE),
    access_token: external_exports.string().optional(),
    id_token: external_exports.string().optional(),
    token_type: external_exports.string().optional(),
    refresh_token: external_exports.string().nullish(),
    expires_in: external_exports.union([
      external_exports.string(),
      external_exports.number(),
      external_exports.null()
    ]).optional(),
    scope: external_exports.union([
      external_exports.string(),
      external_exports.array(external_exports.string()),
      external_exports.null()
    ]).optional()
  }).catchall(external_exports.unknown()),
  S2SOauth2BaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.FAILED),
    error: external_exports.string().optional(),
    error_description: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  S2SOauth2BaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.EXPIRED),
    expired_at: external_exports.string().optional()
  }).catchall(external_exports.unknown())
]);
var CustomS2SOauth2ConnectionDataSchema = BaseSchemeRaw.extend({
  access_token: external_exports.string().optional(),
  id_token: external_exports.string().optional(),
  token_type: external_exports.string().optional(),
  refresh_token: external_exports.string().nullish().optional(),
  expires_in: external_exports.union([
    external_exports.string(),
    external_exports.number(),
    external_exports.null()
  ]).optional(),
  scope: external_exports.union([
    external_exports.string(),
    external_exports.array(external_exports.string()),
    external_exports.null()
  ]).optional()
}).catchall(external_exports.unknown());
var Oauth1InitiatingConnectionDataSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var Oauth1InitiatedConnectionDataSchema = Oauth1InitiatingConnectionDataSchema.extend({
  status: external_exports.literal(ConnectionStatuses.INITIATED),
  authUri: external_exports.string(),
  oauth_token: external_exports.string(),
  oauth_token_secret: external_exports.string(),
  redirectUrl: external_exports.string(),
  callbackUrl: external_exports.string().optional()
}).catchall(external_exports.unknown());
var Oauth1ActiveConnectionDataSchema = Oauth1InitiatingConnectionDataSchema.extend({
  status: external_exports.literal(ConnectionStatuses.ACTIVE),
  oauth_token: external_exports.string(),
  oauth_token_secret: external_exports.string(),
  consumer_key: external_exports.string().optional(),
  oauth_verifier: external_exports.string().optional(),
  redirectUrl: external_exports.string().optional(),
  callback_url: external_exports.string().optional()
}).catchall(external_exports.unknown());
var Oauth1FailedConnectionDataSchema = Oauth1InitiatingConnectionDataSchema.extend({
  status: external_exports.literal(ConnectionStatuses.FAILED),
  error: external_exports.string().optional(),
  error_description: external_exports.string().optional()
}).catchall(external_exports.unknown());
var Oauth1ExpiredConnectionDataSchema = Oauth1InitiatingConnectionDataSchema.extend({
  status: external_exports.literal(ConnectionStatuses.EXPIRED),
  expired_at: external_exports.string().optional()
}).catchall(external_exports.unknown());
var Oauth1InactiveConnectionDataSchema = Oauth1InitiatingConnectionDataSchema.extend({
  status: external_exports.literal(ConnectionStatuses.INACTIVE),
  oauth_token: external_exports.string(),
  oauth_token_secret: external_exports.string(),
  consumer_key: external_exports.string().optional(),
  oauth_verifier: external_exports.string().optional(),
  redirectUrl: external_exports.string().optional(),
  callback_url: external_exports.string().optional()
}).catchall(external_exports.unknown());
var Oauth1ConnectionDataSchema = external_exports.discriminatedUnion("status", [
  Oauth1InitiatingConnectionDataSchema,
  Oauth1InitiatedConnectionDataSchema,
  Oauth1ActiveConnectionDataSchema,
  Oauth1FailedConnectionDataSchema,
  Oauth1ExpiredConnectionDataSchema,
  Oauth1InactiveConnectionDataSchema
]);
var CustomOauth1ConnectionDataSchema = Oauth1ActiveConnectionDataSchema.omit({ status: true });
var BillcomAuthInitiatingSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var BillcomAuthConnectionDataSchema = external_exports.discriminatedUnion("status", [
  BillcomAuthInitiatingSchema,
  BillcomAuthInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.INITIATED),
    redirectUrl: external_exports.string()
  }).catchall(external_exports.unknown()),
  BillcomAuthInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.ACTIVE),
    sessionId: external_exports.string(),
    devKey: external_exports.string()
  }).catchall(external_exports.unknown()),
  BillcomAuthInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.FAILED),
    error: external_exports.string().optional(),
    error_description: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  BillcomAuthInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.EXPIRED),
    expired_at: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  BillcomAuthInitiatingSchema.extend({ status: external_exports.literal(ConnectionStatuses.INACTIVE) }).catchall(external_exports.unknown())
]);
var BasicBaseSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var BasicConnectionDataSchema = external_exports.discriminatedUnion("status", [
  BasicBaseSchema,
  BasicBaseSchema.extend({ status: external_exports.literal(ConnectionStatuses.INITIATED) }).catchall(external_exports.unknown()),
  BasicBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.ACTIVE),
    username: external_exports.string(),
    password: external_exports.string()
  }).catchall(external_exports.unknown()),
  BasicBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.INACTIVE),
    username: external_exports.string(),
    password: external_exports.string()
  }).catchall(external_exports.unknown()),
  BasicBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.FAILED),
    username: external_exports.string(),
    password: external_exports.string(),
    error: external_exports.string().optional(),
    error_description: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  BasicBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.EXPIRED),
    username: external_exports.string(),
    password: external_exports.string(),
    expired_at: external_exports.string().optional()
  }).catchall(external_exports.unknown())
]);
var CustomBasicConnectionDataSchema = BaseSchemeRaw.extend({
  username: external_exports.string(),
  password: external_exports.string()
}).catchall(external_exports.unknown());
var ApiKeyBaseSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var ApiKeyConnectionDataSchema = external_exports.discriminatedUnion("status", [
  ApiKeyBaseSchema,
  ApiKeyBaseSchema.extend({ status: external_exports.literal(ConnectionStatuses.INITIATED) }).catchall(external_exports.unknown()),
  ApiKeyBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.ACTIVE),
    api_key: external_exports.string().optional(),
    generic_api_key: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  ApiKeyBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.INACTIVE),
    api_key: external_exports.string().optional(),
    generic_api_key: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  ApiKeyBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.FAILED),
    error: external_exports.string().optional(),
    error_description: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  ApiKeyBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.EXPIRED),
    expired_at: external_exports.string().optional()
  }).catchall(external_exports.unknown())
]);
var CustomApiKeyConnectionDataSchema = BaseSchemeRaw.extend({
  api_key: external_exports.string().optional(),
  generic_api_key: external_exports.string().optional()
}).catchall(external_exports.unknown());
var BearerTokenBaseSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var BearerTokenConnectionDataSchema = external_exports.discriminatedUnion("status", [
  BearerTokenBaseSchema,
  BearerTokenBaseSchema.extend({ status: external_exports.literal(ConnectionStatuses.INITIATED) }).catchall(external_exports.unknown()),
  BearerTokenBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.ACTIVE),
    token: external_exports.string()
  }).catchall(external_exports.unknown()),
  BearerTokenBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.INACTIVE),
    token: external_exports.string()
  }).catchall(external_exports.unknown()),
  BearerTokenBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.FAILED),
    error: external_exports.string().optional(),
    error_description: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  BearerTokenBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.EXPIRED),
    expired_at: external_exports.string().optional()
  }).catchall(external_exports.unknown())
]);
var CustomBearerTokenConnectionDataSchema = BaseSchemeRaw.extend({ token: external_exports.string() }).catchall(external_exports.unknown());
var GoogleServiceAccountBaseSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var GoogleServiceAccountConnectionDataSchema = external_exports.discriminatedUnion("status", [
  GoogleServiceAccountBaseSchema,
  GoogleServiceAccountBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.INITIATED),
    redirectUrl: external_exports.string(),
    composio_link_redirect_url: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  GoogleServiceAccountBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.ACTIVE),
    credentials_json: external_exports.string()
  }).catchall(external_exports.unknown()),
  GoogleServiceAccountBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.INACTIVE),
    credentials_json: external_exports.string()
  }).catchall(external_exports.unknown()),
  GoogleServiceAccountBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.FAILED),
    error: external_exports.string().optional(),
    error_description: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  GoogleServiceAccountBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.EXPIRED),
    expired_at: external_exports.string().optional()
  }).catchall(external_exports.unknown())
]);
var NoAuthBaseSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var NoAuthConnectionDataSchema = external_exports.discriminatedUnion("status", [
  NoAuthBaseSchema,
  NoAuthBaseSchema.extend({ status: external_exports.literal(ConnectionStatuses.INITIATED) }).catchall(external_exports.unknown()),
  NoAuthBaseSchema.extend({ status: external_exports.literal(ConnectionStatuses.ACTIVE) }).catchall(external_exports.unknown()),
  NoAuthBaseSchema.extend({ status: external_exports.literal(ConnectionStatuses.INACTIVE) }).catchall(external_exports.unknown()),
  NoAuthBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.FAILED),
    error: external_exports.string().optional(),
    error_description: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  NoAuthBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.EXPIRED),
    expired_at: external_exports.string().optional()
  }).catchall(external_exports.unknown())
]);
var CustomNoAuthConnectionDataSchema = BaseSchemeRaw.catchall(external_exports.unknown());
var CalcomAuthBaseSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var CalcomAuthConnectionDataSchema = external_exports.discriminatedUnion("status", [
  CalcomAuthBaseSchema,
  CalcomAuthBaseSchema.extend({ status: external_exports.literal(ConnectionStatuses.INITIATED) }).catchall(external_exports.unknown()),
  CalcomAuthBaseSchema.extend({ status: external_exports.literal(ConnectionStatuses.ACTIVE) }).catchall(external_exports.unknown()),
  CalcomAuthBaseSchema.extend({ status: external_exports.literal(ConnectionStatuses.INACTIVE) }).catchall(external_exports.unknown()),
  CalcomAuthBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.FAILED),
    error: external_exports.string().optional(),
    error_description: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  CalcomAuthBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.EXPIRED),
    expired_at: external_exports.string().optional()
  }).catchall(external_exports.unknown())
]);
var BasicWithJwtBaseSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var BasicWithJwtConnectionDataSchema = external_exports.discriminatedUnion("status", [
  BasicWithJwtBaseSchema,
  BasicWithJwtBaseSchema.extend({ status: external_exports.literal(ConnectionStatuses.INITIATED) }).catchall(external_exports.unknown()),
  BasicWithJwtBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.ACTIVE),
    username: external_exports.string(),
    password: external_exports.string()
  }).catchall(external_exports.unknown()),
  BasicWithJwtBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.INACTIVE),
    username: external_exports.string(),
    password: external_exports.string()
  }).catchall(external_exports.unknown()),
  BasicWithJwtBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.FAILED),
    username: external_exports.string(),
    password: external_exports.string(),
    error: external_exports.string().optional(),
    error_description: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  BasicWithJwtBaseSchema.extend({
    status: external_exports.literal(ConnectionStatuses.EXPIRED),
    username: external_exports.string(),
    password: external_exports.string(),
    expired_at: external_exports.string().optional()
  }).catchall(external_exports.unknown())
]);
var CustomBasicWithJwtConnectionDataSchema = BaseSchemeRaw.extend({
  username: external_exports.string(),
  password: external_exports.string()
}).catchall(external_exports.unknown());
var ServiceAccountInitiatingSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var ServiceAccountConnectionDataSchema = external_exports.discriminatedUnion("status", [
  ServiceAccountInitiatingSchema,
  ServiceAccountInitiatingSchema.extend({ status: external_exports.literal(ConnectionStatuses.INITIATED) }).catchall(external_exports.unknown()),
  ServiceAccountInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.ACTIVE),
    application_id: external_exports.string(),
    installation_id: external_exports.string(),
    private_key: external_exports.string()
  }).catchall(external_exports.unknown()),
  ServiceAccountInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.INACTIVE),
    application_id: external_exports.string(),
    installation_id: external_exports.string(),
    private_key: external_exports.string()
  }).catchall(external_exports.unknown())
]);
var CustomServiceAccountConnectionDataSchema = external_exports.object({
  application_id: external_exports.string(),
  installation_id: external_exports.string(),
  private_key: external_exports.string()
}).merge(BaseSchemeRaw).catchall(external_exports.unknown());
var SamlInitiatingSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var SamlConnectionDataSchema = external_exports.discriminatedUnion("status", [
  SamlInitiatingSchema,
  SamlInitiatingSchema.extend({ status: external_exports.literal(ConnectionStatuses.INITIATED) }).catchall(external_exports.unknown()),
  SamlInitiatingSchema.extend({ status: external_exports.literal(ConnectionStatuses.ACTIVE) }).catchall(external_exports.unknown()),
  SamlInitiatingSchema.extend({ status: external_exports.literal(ConnectionStatuses.INACTIVE) }).catchall(external_exports.unknown()),
  SamlInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.FAILED),
    error: external_exports.string().optional(),
    error_description: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  SamlInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.EXPIRED),
    expired_at: external_exports.string().optional()
  }).catchall(external_exports.unknown())
]);
BaseSchemeRaw.catchall(external_exports.unknown());
var DcrOauthInitiatingSchema = BaseSchemeRaw.extend({ status: external_exports.literal(ConnectionStatuses.INITIALIZING) }).catchall(external_exports.unknown());
var DcrOauthConnectionDataSchema = external_exports.discriminatedUnion("status", [
  DcrOauthInitiatingSchema,
  DcrOauthInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.INITIATED),
    client_id: external_exports.string(),
    redirectUrl: external_exports.string(),
    client_secret: external_exports.string().optional(),
    callback_url: external_exports.string().optional(),
    client_id_issued_at: external_exports.number().optional(),
    client_secret_expires_at: external_exports.number().optional(),
    code_verifier: external_exports.string().optional(),
    finalRedirectUri: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  DcrOauthInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.ACTIVE),
    access_token: external_exports.string(),
    client_id: external_exports.string(),
    token_type: external_exports.string().optional(),
    refresh_token: external_exports.string().nullish(),
    expires_in: external_exports.union([
      external_exports.string(),
      external_exports.number(),
      external_exports.null()
    ]).optional(),
    scope: external_exports.union([
      external_exports.string(),
      external_exports.array(external_exports.string()),
      external_exports.null()
    ]).optional(),
    id_token: external_exports.string().optional(),
    client_secret: external_exports.string().optional(),
    client_id_issued_at: external_exports.number().optional(),
    client_secret_expires_at: external_exports.number().optional()
  }).catchall(external_exports.unknown()),
  DcrOauthInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.INACTIVE),
    access_token: external_exports.string(),
    client_id: external_exports.string(),
    token_type: external_exports.string().optional(),
    refresh_token: external_exports.string().nullish(),
    expires_in: external_exports.union([
      external_exports.string(),
      external_exports.number(),
      external_exports.null()
    ]).optional(),
    scope: external_exports.union([
      external_exports.string(),
      external_exports.array(external_exports.string()),
      external_exports.null()
    ]).optional(),
    id_token: external_exports.string().optional(),
    client_secret: external_exports.string().optional(),
    client_id_issued_at: external_exports.number().optional(),
    client_secret_expires_at: external_exports.number().optional()
  }).catchall(external_exports.unknown()),
  DcrOauthInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.FAILED),
    error: external_exports.string().optional(),
    error_description: external_exports.string().optional()
  }).catchall(external_exports.unknown()),
  DcrOauthInitiatingSchema.extend({
    status: external_exports.literal(ConnectionStatuses.EXPIRED),
    expired_at: external_exports.string().optional()
  }).catchall(external_exports.unknown())
]);
var CustomDcrOauthConnectionDataSchema = external_exports.object({
  access_token: external_exports.string(),
  client_id: external_exports.string()
}).merge(BaseSchemeRaw).catchall(external_exports.unknown());
var ConnectionDataSchema = external_exports.discriminatedUnion("authScheme", [
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.OAUTH1),
    val: Oauth1ConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.OAUTH2),
    val: Oauth2ConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.S2S_OAUTH2),
    val: S2SOauth2ConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.API_KEY),
    val: ApiKeyConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.BASIC),
    val: BasicConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.BEARER_TOKEN),
    val: BearerTokenConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.GOOGLE_SERVICE_ACCOUNT),
    val: GoogleServiceAccountConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.NO_AUTH),
    val: NoAuthConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.CALCOM_AUTH),
    val: CalcomAuthConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.BILLCOM_AUTH),
    val: BillcomAuthConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.BASIC_WITH_JWT),
    val: BasicWithJwtConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.SERVICE_ACCOUNT),
    val: ServiceAccountConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.SAML),
    val: SamlConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.DCR_OAUTH),
    val: DcrOauthConnectionDataSchema
  })
]);
var CustomConnectionDataSchema = external_exports.discriminatedUnion("authScheme", [
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.OAUTH2),
    toolkitSlug: external_exports.string(),
    val: CustomOauth2ConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.S2S_OAUTH2),
    toolkitSlug: external_exports.string(),
    val: CustomS2SOauth2ConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.DCR_OAUTH),
    toolkitSlug: external_exports.string(),
    val: CustomDcrOauthConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.API_KEY),
    toolkitSlug: external_exports.string(),
    val: CustomApiKeyConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.BASIC_WITH_JWT),
    toolkitSlug: external_exports.string(),
    val: CustomBasicWithJwtConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.BASIC),
    toolkitSlug: external_exports.string(),
    val: CustomBasicConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.BEARER_TOKEN),
    toolkitSlug: external_exports.string(),
    val: CustomBearerTokenConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.OAUTH1),
    toolkitSlug: external_exports.string(),
    val: CustomOauth1ConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.NO_AUTH),
    toolkitSlug: external_exports.string(),
    val: CustomNoAuthConnectionDataSchema
  }),
  external_exports.object({
    authScheme: external_exports.literal(AuthSchemeTypes.SERVICE_ACCOUNT),
    toolkitSlug: external_exports.string(),
    val: CustomServiceAccountConnectionDataSchema
  })
]);
var ToolkitSchema = external_exports.object({
  slug: external_exports.string().describe("The slug of the toolkit"),
  name: external_exports.string().describe("The name of the toolkit"),
  logo: external_exports.string().describe("The logo of the toolkit").optional()
});
var JSONSchemaType = external_exports.enum([
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
  "null"
]);
var JSONSchemaPropertySchema = external_exports.object({
  type: external_exports.union([JSONSchemaType, external_exports.array(JSONSchemaType)]).optional(),
  description: external_exports.string().optional(),
  anyOf: external_exports.lazy(() => external_exports.array(JSONSchemaPropertySchema)).optional(),
  oneOf: external_exports.lazy(() => external_exports.array(JSONSchemaPropertySchema)).optional(),
  allOf: external_exports.lazy(() => external_exports.array(JSONSchemaPropertySchema)).optional(),
  not: external_exports.lazy(() => JSONSchemaPropertySchema).optional(),
  title: external_exports.string().optional(),
  default: external_exports.any().optional(),
  nullable: external_exports.boolean().optional(),
  properties: external_exports.lazy(() => external_exports.record(external_exports.string(), JSONSchemaPropertySchema)).optional(),
  required: external_exports.array(external_exports.string()).optional(),
  file_uploadable: external_exports.boolean().optional(),
  file_downloadable: external_exports.boolean().optional(),
  items: external_exports.lazy(() => external_exports.union([JSONSchemaPropertySchema, external_exports.array(JSONSchemaPropertySchema)])).optional(),
  enum: external_exports.array(external_exports.any()).optional(),
  const: external_exports.any().optional(),
  minimum: external_exports.number().optional(),
  maximum: external_exports.number().optional(),
  exclusiveMinimum: external_exports.number().optional(),
  exclusiveMaximum: external_exports.number().optional(),
  multipleOf: external_exports.number().optional(),
  minLength: external_exports.number().optional(),
  maxLength: external_exports.number().optional(),
  pattern: external_exports.string().optional(),
  format: external_exports.string().optional(),
  minItems: external_exports.number().optional(),
  maxItems: external_exports.number().optional(),
  uniqueItems: external_exports.boolean().optional(),
  minProperties: external_exports.number().optional(),
  maxProperties: external_exports.number().optional(),
  patternProperties: external_exports.lazy(() => external_exports.record(external_exports.string(), JSONSchemaPropertySchema)).optional(),
  additionalProperties: external_exports.union([external_exports.boolean(), external_exports.lazy(() => JSONSchemaPropertySchema)]).optional(),
  examples: external_exports.array(external_exports.any()).optional(),
  readOnly: external_exports.boolean().optional(),
  writeOnly: external_exports.boolean().optional(),
  if: external_exports.lazy(() => JSONSchemaPropertySchema).optional(),
  then: external_exports.lazy(() => JSONSchemaPropertySchema).optional(),
  else: external_exports.lazy(() => JSONSchemaPropertySchema).optional(),
  $ref: external_exports.string().optional(),
  definitions: external_exports.record(external_exports.string(), external_exports.lazy(() => JSONSchemaPropertySchema)).optional(),
  $defs: external_exports.record(external_exports.string(), external_exports.lazy(() => JSONSchemaPropertySchema)).optional()
});
var ParametersSchema = external_exports.object({
  type: external_exports.literal("object"),
  anyOf: external_exports.array(JSONSchemaPropertySchema).optional(),
  oneOf: external_exports.array(JSONSchemaPropertySchema).optional(),
  allOf: external_exports.array(JSONSchemaPropertySchema).optional(),
  not: JSONSchemaPropertySchema.optional(),
  properties: external_exports.record(external_exports.string(), JSONSchemaPropertySchema),
  required: external_exports.array(external_exports.string()).optional(),
  title: external_exports.string().optional(),
  default: external_exports.any().optional(),
  nullable: external_exports.boolean().optional(),
  description: external_exports.string().optional(),
  additionalProperties: external_exports.boolean().default(false).optional()
});
var ToolSchema = external_exports.object({
  slug: external_exports.string().describe('The slug of the tool. eg. "GOOGLE_SEARCH"'),
  name: external_exports.string().describe(`The name of the tool. eg. "Google Search"`),
  description: external_exports.string().optional().describe("The description of the tool"),
  inputParameters: ParametersSchema.optional().describe("The input parameters of the tool"),
  outputParameters: ParametersSchema.optional().describe("The output parameters of the tool"),
  tags: external_exports.array(external_exports.string()).describe("The tags of the tool. eg: Important").default([]).optional(),
  toolkit: ToolkitSchema.describe("The toolkit of the tool").optional(),
  version: external_exports.string().describe('The version of the tool, e.g. "20250909_00"').optional(),
  isDeprecated: external_exports.boolean().describe("Whether the tool is deprecated").optional(),
  availableVersions: external_exports.array(external_exports.string()).describe("Available versions of the tool.").default([]).optional(),
  scopes: external_exports.array(external_exports.string()).describe('The scopes of the tool. eg: ["task:add"]').optional(),
  isNoAuth: external_exports.boolean().describe("Do the tool support no auth?").optional()
});
var ToolListResponseSchema = external_exports.object({
  items: external_exports.array(ToolSchema),
  nextCursor: external_exports.string().nullable().optional(),
  totalPages: external_exports.number()
});
var ToolkitLatestVersionSchema = external_exports.literal("latest");
var ToolkitVersionSchema = external_exports.union([ToolkitLatestVersionSchema, external_exports.string()]);
var ToolkitVersionsSchema = external_exports.record(external_exports.string(), ToolkitVersionSchema);
var ToolkitVersionParamSchema = external_exports.union([
  ToolkitVersionsSchema,
  ToolkitLatestVersionSchema,
  external_exports.undefined()
]).describe('The versioning of the toolkits. eg: { "github": "latest", "slack": "20250902_00" }');
var ToolListParamsSchema = external_exports.object({
  tools: external_exports.array(external_exports.string()).optional(),
  toolkits: external_exports.array(external_exports.string()).optional(),
  scopes: external_exports.array(external_exports.string()).optional(),
  tags: external_exports.array(external_exports.string()).optional(),
  limit: external_exports.number().optional(),
  search: external_exports.string().optional(),
  authConfigIds: external_exports.array(external_exports.string()).optional(),
  important: external_exports.boolean().optional()
});
var CustomAuthParamsSchema = external_exports.object({
  baseURL: external_exports.string().optional(),
  body: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
  parameters: external_exports.array(external_exports.object({
    in: external_exports.enum(["query", "header"]),
    name: external_exports.string(),
    value: external_exports.union([external_exports.string(), external_exports.number()])
  }))
});
var ToolExecuteParamsSchema = external_exports.object({
  allowTracing: external_exports.boolean().optional(),
  connectedAccountId: external_exports.string().optional(),
  customAuthParams: CustomAuthParamsSchema.optional(),
  customConnectionData: CustomConnectionDataSchema.optional(),
  arguments: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
  userId: external_exports.string().optional(),
  version: external_exports.union([external_exports.literal("latest"), external_exports.string()]).optional(),
  dangerouslySkipVersionCheck: external_exports.boolean().optional(),
  text: external_exports.string().optional()
});
var ToolExecuteMetaParamsSchema = external_exports.object({
  sessionId: external_exports.string(),
  arguments: external_exports.record(external_exports.string(), external_exports.unknown()).optional()
});
var ToolExecuteResponseSchema = external_exports.object({
  data: external_exports.record(external_exports.string(), external_exports.unknown()),
  error: external_exports.string().nullable(),
  successful: external_exports.boolean(),
  logId: external_exports.string().optional(),
  sessionInfo: external_exports.unknown().optional()
});
var ToolProxyParamsSchema = external_exports.object({
  endpoint: external_exports.string(),
  method: external_exports.enum([
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH"
  ]),
  body: external_exports.unknown().optional(),
  parameters: external_exports.array(external_exports.object({
    in: external_exports.enum(["query", "header"]),
    name: external_exports.string(),
    value: external_exports.union([external_exports.string(), external_exports.number()])
  })).optional(),
  connectedAccountId: external_exports.string().optional(),
  customConnectionData: CustomConnectionDataSchema.describe("DEPRECATED: This field is deprecated and will be removed in the future.").optional()
});
var ConnectedAccountErrorCodes = {
  CONNECTED_ACCOUNT_NOT_FOUND: "CONNECTED_ACCOUNT_NOT_FOUND",
  MULTIPLE_CONNECTED_ACCOUNTS: "MULTIPLE_CONNECTED_ACCOUNTS",
  FAILED_TO_CREATE_CONNECTED_ACCOUNT_LINK: "FAILED_TO_CREATE_CONNECTED_ACCOUNT_LINK"
};
var ComposioConnectedAccountNotFoundError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioConnectedAccountNotFoundError");
  }
  constructor(message = "Connected account not found", options = {}) {
    super(message, {
      ...options,
      code: ConnectedAccountErrorCodes.CONNECTED_ACCOUNT_NOT_FOUND,
      statusCode: 404,
      possibleFixes: options.possibleFixes || ["Ensure the connected account exists and is active in your Composio dashboard"]
    });
    this.name = "ComposioConnectedAccountNotFoundError";
  }
};
var ComposioMultipleConnectedAccountsError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioMultipleConnectedAccountsError");
  }
  constructor(message = "Multiple connected accounts found", options = {}) {
    super(message, {
      ...options,
      code: ConnectedAccountErrorCodes.MULTIPLE_CONNECTED_ACCOUNTS,
      possibleFixes: options.possibleFixes || ["Use the allowMultiple flag to allow multiple connected accounts per user for an auth config"]
    });
    this.name = "ComposioMultipleConnectedAccountsError";
  }
};
var ComposioFailedToCreateConnectedAccountLink = class extends ComposioError$1 {
  static {
    __name(this, "ComposioFailedToCreateConnectedAccountLink");
  }
  constructor(message = "Failed to create connected account link", options = {}) {
    super(message, {
      ...options,
      code: ConnectedAccountErrorCodes.FAILED_TO_CREATE_CONNECTED_ACCOUNT_LINK
    });
    this.name = "ComposioFailedToCreateConnectedAccountLink";
  }
};
var ToolErrorCodes = {
  TOOLSET_NOT_DEFINED: "TOOLSET_NOT_DEFINED",
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  INVALID_MODIFIER: "INVALID_MODIFIER",
  CUSTOM_TOOLS_NOT_INITIALIZED: "CUSTOM_TOOLS_NOT_INITIALIZED",
  TOOL_EXECUTION_ERROR: "TOOL_EXECUTION_ERROR",
  INVALID_EXECUTE_FUNCTION: "INVALID_EXECUTE_FUNCTION",
  GLOBAL_EXECUTE_TOOL_FN_NOT_SET: "GLOBAL_EXECUTE_TOOL_FN_NOT_SET",
  TOOL_VERSION_REQUIRED: "TOOL_VERSION_REQUIRED"
};
var ComposioProviderNotDefinedError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioProviderNotDefinedError");
  }
  constructor(message = "Provider not defined", options = {}) {
    super(message, {
      ...options,
      code: ToolErrorCodes.TOOLSET_NOT_DEFINED,
      possibleFixes: options.possibleFixes || ["Ensure that the provider is defined in the Composio project and passed into the tool instance"]
    });
    this.name = "ComposioProviderNotDefinedError";
  }
};
var ComposioToolNotFoundError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioToolNotFoundError");
  }
  constructor(message = "Tool not found", options = {}) {
    super(message, {
      ...options,
      code: ToolErrorCodes.TOOL_NOT_FOUND,
      possibleFixes: options.possibleFixes || ["Ensure the tool slug is correct and exists in the Composio project"]
    });
    this.name = "ComposioToolNotFoundError";
  }
};
var ComposioInvalidModifierError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioInvalidModifierError");
  }
  constructor(message = "Invalid modifier", options = {}) {
    super(message, {
      ...options,
      code: ToolErrorCodes.INVALID_MODIFIER,
      possibleFixes: options.possibleFixes || ["Ensure the modifier is a function and returns a valid result"]
    });
    this.name = "ComposioInvalidModifierError";
  }
};
var ComposioCustomToolsNotInitializedError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioCustomToolsNotInitializedError");
  }
  constructor(message = "Custom tools not initialized", options = {}) {
    super(message, {
      ...options,
      code: ToolErrorCodes.CUSTOM_TOOLS_NOT_INITIALIZED,
      possibleFixes: options.possibleFixes || ["Ensure the custom tools class is initialized in the Tools instance"]
    });
    this.name = "ComposioCustomToolsNotInitializedError";
  }
};
var ComposioToolExecutionError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioToolExecutionError");
  }
  constructor(message = "Tool execution error", options = {}) {
    super(message, {
      ...options,
      code: options.code || ToolErrorCodes.TOOL_EXECUTION_ERROR,
      cause: options.cause,
      possibleFixes: options.possibleFixes || ["Ensure the tool is correctly configured and the input is valid", "Ensure the userId is correct and has an active connected account for the user in case of non NoAuth toolkits"]
    });
    this.name = "ComposioToolExecutionError";
  }
};
var ComposioInvalidExecuteFunctionError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioInvalidExecuteFunctionError");
  }
  constructor(message = "Invalid execute function", options = {}) {
    super(message, {
      ...options,
      code: ToolErrorCodes.INVALID_EXECUTE_FUNCTION,
      possibleFixes: options.possibleFixes || ["Ensure the execute function is a valid function and returns a valid result"]
    });
    this.name = "ComposioInvalidExecuteFunctionError";
  }
};
var ComposioGlobalExecuteToolFnNotSetError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioGlobalExecuteToolFnNotSetError");
  }
  constructor(message = "Global execute tool function not set", options = {}) {
    super(message, {
      ...options,
      code: ToolErrorCodes.GLOBAL_EXECUTE_TOOL_FN_NOT_SET,
      possibleFixes: options.possibleFixes || ["Ensure the global execute tool function is set in the provider"]
    });
    this.name = "ComposioGlobalExecuteToolFnNotSetError";
  }
};
var ComposioToolVersionRequiredError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioToolVersionRequiredError");
  }
  constructor(message = "Toolkit version not specified. For manual execution of the tool please pass a specific toolkit version", options = {}) {
    super(message, {
      ...options,
      code: ToolErrorCodes.TOOL_VERSION_REQUIRED,
      possibleFixes: options.possibleFixes || [
        'Pass the toolkit version as a parameter to the execute function ("latest" is not supported in manual execution)',
        'Set the toolkit versions in the Composio config (toolkitVersions: { <toolkit-slug>: "<toolkit-version>" })',
        "Set the toolkit version in the environment variable (COMPOSIO_TOOLKIT_VERSION_<TOOLKIT_SLUG>)",
        "Set dangerouslySkipVersionCheck to true (this might cause unexpected behavior when new versions of the tools are released)"
      ]
    });
  }
};
var ERROR_CODE_HANDLERS = /* @__PURE__ */ new Map([[1803, (msg) => new ComposioConnectedAccountNotFoundError(msg)]]);
var handleToolExecutionError = /* @__PURE__ */ __name((tool, actualError) => {
  if (actualError instanceof APIError && actualError.error) {
    const errorBody = actualError.error;
    const errorCode = errorBody?.error?.code;
    const errorMessage = errorBody?.error?.message;
    if (errorCode && ERROR_CODE_HANDLERS.has(errorCode)) return ERROR_CODE_HANDLERS.get(errorCode)(errorMessage || "An error occurred");
  }
  return new ComposioToolExecutionError(`Error executing the tool ${tool}`, {
    cause: actualError,
    possibleFixes: ["Ensure the tool slug is correct and the input arguments for the tool is valid"]
  });
}, "handleToolExecutionError");
var AuthConfigErrorCodes = { AUTH_CONFIG_NOT_FOUND: "AUTH_CONFIG_NOT_FOUND" };
var ComposioAuthConfigNotFoundError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioAuthConfigNotFoundError");
  }
  constructor(message = "Auth config not found", options = {}) {
    super(message, {
      ...options,
      code: AuthConfigErrorCodes.AUTH_CONFIG_NOT_FOUND,
      possibleFixes: options.possibleFixes || [
        "Check if the auth config exists",
        "Check if the auth config id is correct",
        "Check if the auth config is enabled"
      ]
    });
    this.name = "ComposioAuthConfigNotFoundError";
  }
};
var ConnectionRequestErrorCodes = {
  CONNECTION_REQUEST_TIMEOUT: "CONNECTION_REQUEST_TIMEOUT",
  CONNECTION_REQUEST_FAILED: "CONNECTION_REQUEST_FAILED"
};
var ConnectionRequestTimeoutError = class extends ComposioError$1 {
  static {
    __name(this, "ConnectionRequestTimeoutError");
  }
  constructor(message = "Connection request timed out", options = {}) {
    super(message, {
      ...options,
      code: ConnectionRequestErrorCodes.CONNECTION_REQUEST_TIMEOUT
    });
    this.name = "ConnectionRequestTimeoutError";
  }
};
var ConnectionRequestFailedError = class extends ComposioError$1 {
  static {
    __name(this, "ConnectionRequestFailedError");
  }
  constructor(message = "Connection request failed", options = {}) {
    super(message, {
      ...options,
      code: ConnectionRequestErrorCodes.CONNECTION_REQUEST_FAILED
    });
    this.name = "ConnectionRequestFailedError";
  }
};
var ToolkitErrorCodes = { TOOLKIT_NOT_FOUND: "TOOLKIT_NOT_FOUND" };
var ComposioToolkitNotFoundError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioToolkitNotFoundError");
  }
  constructor(message = "Toolkit not found", options = {}) {
    super(message, {
      ...options,
      code: "TOOLKIT_NOT_FOUND",
      possibleFixes: options.possibleFixes || ["Ensure the toolkit is correctly configured and the slug is valid"]
    });
    this.name = "ComposioToolkitNotFoundError";
  }
};
var ComposioToolkitFetchError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioToolkitFetchError");
  }
  constructor(message = "Failed to fetch toolkit", options = {}) {
    super(message, {
      ...options,
      code: "TOOLKIT_FETCH_ERROR",
      possibleFixes: options.possibleFixes || [
        "Ensure the toolkit slug is valid",
        "Ensure you are using the correct API key",
        "Ensure you are using the correct API endpoint / Base URL and it is working"
      ]
    });
    this.name = "ComposioToolkitFetchError";
  }
};
var ValidationErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  JSON_SCHEMA_TO_ZOD_ERROR: "JSON_SCHEMA_TO_ZOD_ERROR"
};
var ValidationError = class extends ComposioError$1 {
  static {
    __name(this, "ValidationError");
  }
  constructor(message = "Input validation failed", options = {}) {
    const { cause: providedZodError, ...restOptions } = options;
    let zodErrorInstance;
    if (providedZodError instanceof ZodError) zodErrorInstance = providedZodError;
    else zodErrorInstance = new ZodError([{
      path: [],
      message: "Invalid input",
      code: "custom"
    }]);
    const issues = zodErrorInstance.issues.map((issue) => `[${issue.code}] ${issue.path.join(".")} - ${issue.message}`);
    super(message, {
      ...restOptions,
      code: options.code || ValidationErrorCodes.VALIDATION_ERROR,
      possibleFixes: issues,
      cause: zodErrorInstance
    });
    this.name = "ValidationError";
    this.message = `${message}: ${this.generateUserFriendlyMessage()}`;
  }
  generateUserFriendlyMessage() {
    if (this.cause instanceof ZodError && this.cause.issues.length > 0) {
      const issue = this.cause.issues[0];
      const param = issue.path.join(".") || "parameter";
      if (issue.code === "invalid_type") return `The ${param} should be a ${issue.expected}, but you provided a ${issue.received}`;
      return issue.message;
    }
    return "Please check your input parameters";
  }
};
var JsonSchemaToZodError = class extends ComposioError$1 {
  static {
    __name(this, "JsonSchemaToZodError");
  }
  constructor(message = "Failed to convert JSON schema to Zod schema", options = {}) {
    super(message, {
      ...options,
      code: options.code || ValidationErrorCodes.JSON_SCHEMA_TO_ZOD_ERROR
    });
  }
};
var SDKErrorCodes = { NO_API_KEY_PROVIDED: "NO_API_KEY_PROVIDED" };
var ComposioNoAPIKeyError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioNoAPIKeyError");
  }
  constructor(message = "No Composio API key provided", options = {}) {
    const defaultCause = "Couldn't find an API key in the params, environment variables or in the user config file";
    super(message, {
      ...options,
      code: SDKErrorCodes.NO_API_KEY_PROVIDED,
      cause: options.cause || defaultCause,
      possibleFixes: options.possibleFixes || [
        "Ensure you have an API key passed in the params, or in environment variable (COMPOSIO_API_KEY) or in the user config file",
        "To get an API key, please sign up at https://composio.dev/signup",
        "You can also use the Composio CLI to create a project and get an API key"
      ],
      statusCode: 401
    });
    this.name = "ComposioNoAPIKeyError";
  }
};
var TriggerErrorCodes = {
  TRIGGER_FAILED_TO_GET_SDK_REALTIME_CREDENTIALS: "TRIGGER_FAILED_TO_GET_SDK_REALTIME_CREDENTIALS",
  TRIGGER_FAILED_TO_CREATE_PUSHER_CLIENT: "TRIGGER_FAILED_TO_CREATE_PUSHER_CLIENT",
  TRIGGER_FAILED_TO_SUBSCRIBE_TO_PUSHER_CHANNEL: "TRIGGER_FAILED_TO_SUBSCRIBE_TO_PUSHER_CHANNEL",
  TRIGGER_FAILED_TO_UNSUBSCRIBE_FROM_PUSHER_CHANNEL: "TRIGGER_FAILED_TO_UNSUBSCRIBE_FROM_PUSHER_CHANNEL",
  TRIGGER_TYPE_NOT_FOUND: "TRIGGER_TYPE_NOT_FOUND",
  WEBHOOK_SIGNATURE_VERIFICATION_FAILED: "WEBHOOK_SIGNATURE_VERIFICATION_FAILED",
  WEBHOOK_PAYLOAD_INVALID: "WEBHOOK_PAYLOAD_INVALID"
};
var ComposioFailedToGetSDKRealtimeCredentialsError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioFailedToGetSDKRealtimeCredentialsError");
  }
  constructor(message = "Failed to get SDK realtime credentials", options = {}) {
    super(message, {
      ...options,
      code: TriggerErrorCodes.TRIGGER_FAILED_TO_GET_SDK_REALTIME_CREDENTIALS,
      possibleFixes: options.possibleFixes || ["Please contact support."]
    });
    this.name = "ComposioFailedToGetSDKRealtimeCredentialsError";
  }
};
var ComposioFailedToCreatePusherClientError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioFailedToCreatePusherClientError");
  }
  constructor(message = "Failed to create Pusher client", options = {}) {
    super(message, {
      ...options,
      code: TriggerErrorCodes.TRIGGER_FAILED_TO_CREATE_PUSHER_CLIENT,
      possibleFixes: options.possibleFixes || ["Please contact support."]
    });
    this.name = "ComposioFailedToCreatePusherClientError";
  }
};
var ComposioFailedToSubscribeToPusherChannelError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioFailedToSubscribeToPusherChannelError");
  }
  constructor(message = "Failed to subscribe to Pusher channel", options = {}) {
    super(message, {
      ...options,
      code: TriggerErrorCodes.TRIGGER_FAILED_TO_SUBSCRIBE_TO_PUSHER_CHANNEL,
      possibleFixes: options.possibleFixes || ["Please contact support."]
    });
    this.name = "ComposioFailedToSubscribeToPusherChannelError";
  }
};
var ComposioFailedToUnsubscribeFromPusherChannelError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioFailedToUnsubscribeFromPusherChannelError");
  }
  constructor(message = "Failed to unsubscribe from Pusher channel", options = {}) {
    super(message, {
      ...options,
      code: TriggerErrorCodes.TRIGGER_FAILED_TO_UNSUBSCRIBE_FROM_PUSHER_CHANNEL,
      possibleFixes: options.possibleFixes || ["Please contact support."]
    });
    this.name = "ComposioFailedToUnsubscribeFromPusherChannelError";
  }
};
var ComposioTriggerTypeNotFoundError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioTriggerTypeNotFoundError");
  }
  constructor(message = "Trigger type not found", options = {}) {
    super(message, {
      ...options,
      code: TriggerErrorCodes.TRIGGER_TYPE_NOT_FOUND,
      statusCode: 404,
      possibleFixes: options.possibleFixes || ["Please contact support."]
    });
    this.name = "ComposioTriggerTypeNotFoundError";
  }
};
var ComposioWebhookSignatureVerificationError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioWebhookSignatureVerificationError");
  }
  constructor(message = "Webhook signature verification failed", options = {}) {
    super(message, {
      ...options,
      code: TriggerErrorCodes.WEBHOOK_SIGNATURE_VERIFICATION_FAILED,
      statusCode: 401,
      possibleFixes: options.possibleFixes || [
        "Verify that the webhook secret is correct.",
        "Ensure the raw request body is passed without modifications.",
        "Check that the signature header value is being passed correctly."
      ]
    });
    this.name = "ComposioWebhookSignatureVerificationError";
  }
};
var ComposioWebhookPayloadError = class extends ComposioError$1 {
  static {
    __name(this, "ComposioWebhookPayloadError");
  }
  constructor(message = "Invalid webhook payload", options = {}) {
    super(message, {
      ...options,
      code: TriggerErrorCodes.WEBHOOK_PAYLOAD_INVALID,
      statusCode: 400,
      possibleFixes: options.possibleFixes || ["Ensure the webhook payload is valid JSON.", "Verify the payload structure matches the expected format."]
    });
    this.name = "ComposioWebhookPayloadError";
  }
};
var ConnectedAccountStatuses = {
  INITIALIZING: "INITIALIZING",
  INITIATED: "INITIATED",
  ACTIVE: "ACTIVE",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
  INACTIVE: "INACTIVE"
};
var ConnectedAccountStatusSchema = external_exports.enum([
  ConnectedAccountStatuses.INITIALIZING,
  ConnectedAccountStatuses.INITIATED,
  ConnectedAccountStatuses.ACTIVE,
  ConnectedAccountStatuses.FAILED,
  ConnectedAccountStatuses.EXPIRED,
  ConnectedAccountStatuses.INACTIVE
]);
var CreateConnectedAccountParamsSchema = external_exports.object({
  authConfig: external_exports.object({ id: external_exports.string() }),
  connection: external_exports.object({
    data: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
    callbackUrl: external_exports.string().optional(),
    userId: external_exports.string().optional()
  })
});
var DefaultCreateConnectedAccountParamsSchema = external_exports.object({
  auth_config: external_exports.object({ id: external_exports.string() }),
  connection: external_exports.object({
    state: ConnectionDataSchema.optional(),
    data: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
    callback_url: external_exports.string().optional(),
    user_id: external_exports.string().optional()
  })
});
var CreateConnectedAccountOptionsSchema = external_exports.object({
  allowMultiple: external_exports.boolean().optional(),
  callbackUrl: external_exports.string().optional(),
  config: ConnectionDataSchema.optional()
});
var CreateConnectedAccountResponseSchema = external_exports.object({
  id: external_exports.string(),
  status: ConnectedAccountStatusSchema,
  redirectUrl: external_exports.string().nullable()
});
var ConnectedAccountAuthConfigSchema = external_exports.object({
  id: external_exports.string(),
  authScheme: AuthSchemeEnum.optional(),
  isComposioManaged: external_exports.boolean(),
  isDisabled: external_exports.boolean()
});
var ConnectedAccountRetrieveResponseSchema = external_exports.object({
  id: external_exports.string(),
  authConfig: ConnectedAccountAuthConfigSchema,
  data: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
  params: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
  status: ConnectedAccountStatusSchema,
  statusReason: external_exports.string().nullable(),
  toolkit: external_exports.object({ slug: external_exports.string() }),
  state: ConnectionDataSchema.optional(),
  testRequestEndpoint: external_exports.string().optional(),
  isDisabled: external_exports.boolean(),
  createdAt: external_exports.string(),
  updatedAt: external_exports.string()
});
var ConnectedAccountListParamsSchema = external_exports.object({
  authConfigIds: external_exports.array(external_exports.string()).nullable().optional().describe("The auth config ids of the connected accounts"),
  cursor: external_exports.string().nullish().describe("The cursor to paginate through the connected accounts"),
  limit: external_exports.number().nullable().optional().describe("The limit of the connected accounts to return"),
  orderBy: external_exports.enum(["created_at", "updated_at"]).optional().describe("The order by of the connected accounts"),
  statuses: external_exports.array(ConnectedAccountStatusSchema).nullable().optional().describe("The statuses of the connected accounts"),
  toolkitSlugs: external_exports.array(external_exports.string()).nullable().optional().describe("The toolkit slugs of the connected accounts"),
  userIds: external_exports.array(external_exports.string()).nullable().optional().describe("The user ids of the connected accounts")
});
var ConnectedAccountListResponseSchema = external_exports.object({
  items: external_exports.array(ConnectedAccountRetrieveResponseSchema).describe("The list of connected accounts"),
  nextCursor: external_exports.string().nullish().describe("The next cursor to paginate through the connected accounts"),
  totalPages: external_exports.number().describe("The total number of pages of connected accounts")
});
var CreateConnectedAccountLinkOptionsSchema = external_exports.object({ callbackUrl: external_exports.string().optional() });
var CreateConnectedAccountLinkResponseSchema = external_exports.object({ redirectUrl: external_exports.string() });
var ConnectedAccountRefreshOptionsSchema = external_exports.object({
  redirectUrl: external_exports.string().optional(),
  validateCredentials: external_exports.boolean().optional()
});
function transform(raw) {
  return { with(schema) {
    return { using(transformer, options) {
      const transformed = transformer(raw);
      const result = schema.safeParse(transformed);
      if (!result.success) {
        logger_default.error(result.error);
        return transformed;
      }
      return result.data;
    } };
  } };
}
__name(transform, "transform");
function transformConnectedAccountResponse(response) {
  const parseState = /* @__PURE__ */ __name((state) => {
    try {
      return state ? ConnectionDataSchema.parse(state) : void 0;
    } catch (error) {
      logger_default.warn("Unsupported auth scheme in connected account state, ignoring state field", { error });
      return;
    }
  }, "parseState");
  return transform(response).with(ConnectedAccountRetrieveResponseSchema).using((response$1) => ({
    ...response$1,
    authConfig: {
      ...response$1.auth_config,
      id: response$1.auth_config.id,
      authScheme: response$1.auth_config.auth_scheme,
      isComposioManaged: response$1.auth_config.is_composio_managed,
      isDisabled: response$1.auth_config.is_disabled
    },
    data: response$1.data ?? void 0,
    state: parseState(response$1.state),
    status: response$1.status,
    statusReason: response$1.status_reason,
    isDisabled: response$1.is_disabled,
    createdAt: response$1.created_at,
    updatedAt: response$1.updated_at,
    testRequestEndpoint: response$1.test_request_endpoint
  }));
}
__name(transformConnectedAccountResponse, "transformConnectedAccountResponse");
function transformConnectedAccountListResponse(response) {
  return transform(response).with(ConnectedAccountListResponseSchema).using((response$1) => ({
    items: response$1.items.map(transformConnectedAccountResponse),
    nextCursor: response$1.next_cursor ?? null,
    totalPages: response$1.total_pages
  }));
}
__name(transformConnectedAccountListResponse, "transformConnectedAccountListResponse");
var CustomTools = class {
  static {
    __name(this, "CustomTools");
  }
  client;
  customToolsRegistry;
  constructor(client) {
    if (!client) throw new ComposioError$1("ComposioClient is required");
    this.client = client;
    this.customToolsRegistry = /* @__PURE__ */ new Map();
    telemetry.instrument(this, "CustomTools");
  }
  /**
  * Create a custom tool and registers it in the registry.
  * This is just an in memory registry and is not persisted.
  * @param {CustomToolOptions} toolOptions CustomToolOptions
  * @returns {Tool} The tool created
  *
  * @example
  * ```typescript
  * // Create a custom tool with input parameters
  * const customTool = await composio.customTools.createTool({
  *   name: 'My Custom Tool',
  *   description: 'A tool that performs a custom operation',
  *   slug: 'MY_CUSTOM_TOOL',
  *   inputParams: z.object({
  *     query: z.string().describe('The search query'),
  *     limit: z.number().optional().describe('Maximum number of results')
  *   }),
  *   execute: async (input, connectionConfig, executeToolRequest) => {
  *     // Custom implementation logic
  *     return {
  *       data: { results: ['result1', 'result2'] }
  *     };
  *   }
  * });
  * ```
  */
  async createTool(toolOptions) {
    const { slug, execute, inputParams, name, description } = toolOptions;
    if (!slug || !execute || !inputParams || !name) throw new Error("Invalid tool options");
    const paramsSchemaJson = esm_default(inputParams, { name: "input" }).definitions.input;
    const toolSchema = {
      name,
      slug,
      description,
      inputParameters: {
        title: name,
        type: "object",
        description,
        properties: paramsSchemaJson.properties,
        required: paramsSchemaJson.required
      },
      outputParameters: {
        type: "object",
        title: `Response for ${name}`,
        properties: {}
      },
      tags: [],
      toolkit: {
        name: "custom",
        slug: "custom"
      }
    };
    this.customToolsRegistry.set(slug.toLowerCase(), {
      options: toolOptions,
      schema: toolSchema
    });
    return toolSchema;
  }
  /**
  * Get all the custom tools from the registry.
  * @param {string[]} param0.toolSlugs The slugs of the tools to get
  * @returns {ToolList} The list of tools
  *
  * @example
  * ```typescript
  * // Get all custom tools
  * const allTools = await composio.customTools.getCustomTools({});
  *
  * // Get specific custom tools by slug
  * const specificTools = await composio.customTools.getCustomTools({
  *   toolSlugs: ['MY_CUSTOM_TOOL', 'ANOTHER_CUSTOM_TOOL']
  * });
  * ```
  */
  async getCustomTools({ toolSlugs }) {
    const tools = [];
    if (toolSlugs) for (const slug of toolSlugs) {
      const tool = this.customToolsRegistry.get(slug.toLowerCase());
      if (tool) tools.push(tool.schema);
    }
    else return Array.from(this.customToolsRegistry.values()).map((tool) => tool.schema);
    return tools;
  }
  /**
  * Get a custom tool by slug from the registry.
  * @param {string} slug The slug of the tool to get
  * @returns {Tool} The tool
  *
  * @example
  * ```typescript
  * // Get a specific custom tool by its slug
  * const myTool = await composio.customTools.getCustomToolBySlug('MY_CUSTOM_TOOL');
  * if (myTool) {
  *   console.log(`Found tool: ${myTool.name}`);
  * } else {
  *   console.log('Tool not found');
  * }
  * ```
  */
  async getCustomToolBySlug(slug) {
    try {
      return this.customToolsRegistry.get(slug.toLowerCase())?.schema;
    } catch (error) {
      logger_default.error(`Error getting custom tool: ${error}`);
      return;
    }
  }
  /**
  * Get the connected account for the user and toolkit.
  * @param {string} toolkitSlug The slug of the toolkit
  * @param {ExecuteMetadata} metadata The metadata of the execution
  * @returns {ConnectedAccount} The connected account
  */
  async getConnectedAccountForToolkit(toolkitSlug, userId, connectedAccountId) {
    try {
      await this.client.toolkits.retrieve(toolkitSlug);
      if ((await this.client.toolkits.retrieve(toolkitSlug)).auth_config_details?.some((details) => details.mode === AuthSchemeTypes.NO_AUTH)) return null;
    } catch (error) {
      throw new ComposioToolNotFoundError(`Toolkit with slug ${toolkitSlug} not found`, { cause: error });
    }
    const connectedAccounts = await this.client.connectedAccounts.list({
      toolkit_slugs: [toolkitSlug],
      user_ids: [userId]
    });
    if (!connectedAccounts.items.length) throw new ComposioConnectedAccountNotFoundError(`No connected accounts found for toolkit ${toolkitSlug}`);
    const connectedAccount = connectedAccountId ? connectedAccounts.items.find((item) => item.id === connectedAccountId) : connectedAccounts.items[0];
    if (!connectedAccount) throw new ComposioConnectedAccountNotFoundError(`Connected account not found for toolkit ${toolkitSlug} for user ${userId}`);
    return transformConnectedAccountResponse(connectedAccount);
  }
  /**
  * Execute a custom tool
  *
  * @description If a toolkit is used, the connected account id is used to execute the tool.
  * If a connected account id is provided, it is used to execute the tool.
  * If a connected account id is not provided, the first connected account for the toolkit is used.
  *
  * @param {slug} slug The slug of the tool to execute
  * @param {Record<string, unknown>} inputParams The input parameters for the tool
  * @param {ExecuteMetadata} metadata The metadata of the execution
  * @returns {Promise<ToolExecuteResponse>} The response from the tool
  */
  async executeCustomTool(slug, body) {
    const tool = this.customToolsRegistry.get(slug.toLowerCase());
    if (!tool) throw new ComposioToolNotFoundError(`Tool with slug ${slug} not found`);
    let connectionConfig = null;
    const { toolkitSlug, execute, inputParams } = tool.options;
    let connectedAccountId = body.connectedAccountId;
    if (toolkitSlug && toolkitSlug !== "custom" && body.userId) {
      const connectedAccount = await this.getConnectedAccountForToolkit(toolkitSlug, body.userId, body.connectedAccountId);
      logger_default.debug(`[CustomTool] Connected account for ${toolkitSlug} found for user ${body.userId}`, JSON.stringify(connectedAccount, null, 2));
      if (!connectedAccount) throw new ComposioConnectedAccountNotFoundError(`Connected account not found for toolkit ${toolkitSlug} for user ${body.userId}`, { meta: {
        toolkitSlug,
        userId: body.userId
      } });
      connectionConfig = connectedAccount.state ?? null;
      connectedAccountId = connectedAccount.id;
    }
    if (typeof execute !== "function") throw new ComposioInvalidExecuteFunctionError("Invalid execute function", { meta: { toolSlug: slug } });
    const executeToolRequest = /* @__PURE__ */ __name(async (data) => {
      if (toolkitSlug && toolkitSlug === "custom") throw new ComposioInvalidExecuteFunctionError("Custom tools without a toolkit cannot be executed using the executeToolRequest function", { possibleFixes: ["Please manually execute the tool using your logic.", "Pass a toolkit slug to execute the tool on behalf of a toolkit credentials"] });
      const parameters = data.parameters?.map((param) => ({
        name: param.name,
        type: param.in,
        value: param.value.toString()
      }));
      return {
        data: (await this.client.tools.proxy({
          endpoint: data.endpoint,
          method: data.method,
          parameters,
          body: data.body,
          connected_account_id: connectedAccountId,
          custom_connection_data: data.customConnectionData
        })).data,
        error: null,
        successful: true,
        logId: void 0,
        sessionInfo: void 0
      };
    }, "executeToolRequest");
    const parsedInput = inputParams.safeParse(body.arguments);
    if (!parsedInput.success) throw new ValidationError("Invalid input parameters", { cause: parsedInput.error });
    return execute(parsedInput.data, connectionConfig, executeToolRequest);
  }
};
var getToolkitVersion = /* @__PURE__ */ __name((toolkitSlug, toolkitVersions) => {
  if (typeof toolkitVersions === "string") return toolkitVersions;
  if (toolkitVersions && Object.keys(toolkitVersions).length > 0) return toolkitVersions[toolkitSlug] ?? "latest";
  return "latest";
}, "getToolkitVersion");
var Tools3 = class {
  static {
    __name(this, "Tools");
  }
  client;
  customTools;
  provider;
  autoUploadDownloadFiles;
  toolkitVersions;
  constructor(client, config) {
    if (!client) throw new Error("ComposioClient is required");
    if (!config?.provider) throw new ComposioProviderNotDefinedError("Provider not passed into Tools instance");
    this.client = client;
    this.customTools = new CustomTools(client);
    this.provider = config.provider;
    this.autoUploadDownloadFiles = config?.autoUploadDownloadFiles ?? CONFIG_DEFAULTS.autoUploadDownloadFiles;
    this.toolkitVersions = config?.toolkitVersions ?? CONFIG_DEFAULTS.toolkitVersions;
    this.execute = this.execute.bind(this);
    this.provider._setExecuteToolFn(this.createExecuteFnForProviders());
    this.getRawComposioToolBySlug = this.getRawComposioToolBySlug.bind(this);
    this.getRawComposioTools = this.getRawComposioTools.bind(this);
    telemetry.instrument(this, "Tools");
  }
  /**
  * Transforms tool data from snake_case API format to camelCase for internal SDK use.
  *
  * This method standardizes the property naming convention for tools retrieved from the Composio API,
  * making them more consistent with JavaScript/TypeScript conventions.
  *
  * @param {ToolRetrieveResponse | ComposioToolListResponse['items'][0]} tool - The tool object to transform
  * @returns {Tool} The transformed tool with camelCase properties
  *
  * @private
  */
  transformToolCases(tool) {
    return ToolSchema.parse({
      ...tool,
      inputParameters: tool.input_parameters,
      outputParameters: tool.output_parameters,
      availableVersions: tool.available_versions,
      isDeprecated: tool.deprecated?.is_deprecated ?? false,
      isNoAuth: tool.no_auth
    });
  }
  /**
  * Transforms tool execution response from snake_case API format to camelCase.
  *
  * This method converts the response received from the Composio API to a standardized format
  * with consistent property naming that follows JavaScript/TypeScript conventions.
  *
  * @param {ComposioToolExecuteResponse} response - The raw API response to transform
  * @returns {ToolExecuteResponse} The transformed response with camelCase properties
  *
  * @private
  */
  transformToolExecuteResponse(response) {
    return ToolExecuteResponseSchema.parse({
      data: response.data,
      error: response.error,
      successful: response.successful,
      logId: response.log_id,
      sessionInfo: response.session_info
    });
  }
  /**
  * Applies the default schema modifiers to the tools
  * @param tools - The tools to apply the default schema modifiers to
  * @returns The tools with the default schema modifiers applied
  */
  async applyDefaultSchemaModifiers(tools) {
    if (this.autoUploadDownloadFiles) {
      const fileToolModifier = new FileToolModifier(this.client);
      return await Promise.all(tools.map((tool) => fileToolModifier.modifyToolSchema(tool.slug, tool.toolkit?.slug ?? "unknown", tool)));
    } else return tools;
  }
  /**
  * Applies the before execute modifiers to the tool execution params
  * @param options.toolSlug - The slug of the tool
  * @param options.toolkitSlug - The slug of the toolkit
  * @param options.params - The params of the tool execution
  * @param modifier - The modifier to apply
  * @returns The modified params
  */
  async applyBeforeExecuteModifiers(tool, { toolSlug, toolkitSlug, params }, modifier) {
    let modifiedParams = params;
    if (this.autoUploadDownloadFiles) modifiedParams = await new FileToolModifier(this.client).fileUploadModifier(tool, {
      toolSlug,
      toolkitSlug,
      params: modifiedParams
    });
    if (modifier) if (typeof modifier === "function") modifiedParams = await modifier({
      toolSlug,
      toolkitSlug,
      params: modifiedParams
    });
    else throw new ComposioInvalidModifierError("Invalid beforeExecute modifier. Not a function.");
    return modifiedParams;
  }
  /**
  * Applies the after execute modifiers to the tool execution result
  * @param options.toolSlug - The slug of the tool
  * @param options.toolkitSlug - The slug of the toolkit
  * @param options.result - The result of the tool execution
  * @param modifier - The modifier to apply
  * @returns The modified result
  */
  async applyAfterExecuteModifiers(tool, { toolSlug, toolkitSlug, result }, modifier) {
    let modifiedResult = result;
    if (this.autoUploadDownloadFiles) modifiedResult = await new FileToolModifier(this.client).fileDownloadModifier(tool, {
      toolSlug,
      toolkitSlug,
      result: modifiedResult
    });
    if (modifier) if (typeof modifier === "function") modifiedResult = await modifier({
      toolSlug,
      toolkitSlug,
      result: modifiedResult
    });
    else throw new ComposioInvalidModifierError("Invalid afterExecute modifier. Not a function.");
    return modifiedResult;
  }
  /**
  * Lists all tools available in the Composio SDK including custom tools.
  *
  * This method fetches tools from the Composio API in raw format and combines them with
  * any registered custom tools. The response can be filtered and modified as needed.
  * It provides access to the underlying tool data without provider-specific wrapping.
  *
  * @param {ToolListParams} query - Query parameters to filter the tools (required)
  * @param {GetRawComposioToolsOptions} [options] - Optional configuration for tool retrieval
  * @param {TransformToolSchemaModifier} [options.modifySchema] - Function to transform tool schemas
  * @returns {Promise<ToolList>} List of tools matching the query criteria
  *
  * @example
  * ```typescript
  * // Get tools from specific toolkits
  * const githubTools = await composio.tools.getRawComposioTools({
  *   toolkits: ['github'],
  *   limit: 10
  * });
  *
  * // Get specific tools by slug
  * const specificTools = await composio.tools.getRawComposioTools({
  *   tools: ['GITHUB_GET_REPOS', 'HACKERNEWS_GET_USER']
  * });
  *
  * // Get tools from specific toolkits
  * const githubTools = await composio.tools.getRawComposioTools({
  *   toolkits: ['github'],
  *   limit: 10
  * });
  *
  * // Get tools with schema transformation
  * const customizedTools = await composio.tools.getRawComposioTools({
  *   toolkits: ['github'],
  *   limit: 5
  * }, {
  *   modifySchema: ({ toolSlug, toolkitSlug, schema }) => {
  *     // Add custom properties to tool schema
  *     return {
  *       ...schema,
  *       customProperty: `Modified ${toolSlug} from ${toolkitSlug}`,
  *       tags: [...(schema.tags || []), 'customized']
  *     };
  *   }
  * });
  *
  * // Search for tools
  * const searchResults = await composio.tools.getRawComposioTools({
  *   search: 'user management'
  * });
  *
  * // Get tools by authentication config
  * const authSpecificTools = await composio.tools.getRawComposioTools({
  *   authConfigIds: ['auth_config_123']
  * });
  * ```
  */
  async getRawComposioTools(query, options) {
    if ("tools" in query && "toolkits" in query) throw new ValidationError("Invalid tool list parameters. You should not use tools and toolkits filter together.");
    const queryParams = ToolListParamsSchema.safeParse(query);
    if (queryParams.error) throw new ValidationError("Invalid tool list parameters", { cause: queryParams.error });
    const shouldAutoApplyImportant = "toolkits" in queryParams.data && !("tools" in queryParams.data) && !("tags" in queryParams.data) && !("search" in queryParams.data) && !("limit" in queryParams.data) && queryParams.data.important !== false;
    const effectiveImportant = "important" in queryParams.data ? queryParams.data.important : shouldAutoApplyImportant;
    if (!("tools" in queryParams.data || "toolkits" in queryParams.data || "search" in queryParams.data || "authConfigIds" in queryParams.data)) throw new ValidationError("Invalid tool list parameters, atleast one of the following parameters is required: tools, toolkits, search, authConfigIds");
    let limit3 = "limit" in queryParams.data ? queryParams.data.limit : void 0;
    if ("tools" in queryParams.data) limit3 = 9999;
    const filters = {
      ..."tools" in queryParams.data ? { tool_slugs: queryParams.data.tools?.join(",") } : {},
      ..."toolkits" in queryParams.data ? { toolkit_slug: queryParams.data.toolkits?.join(",") } : {},
      ...limit3 ? { limit: limit3 } : {},
      ..."tags" in queryParams.data ? { tags: queryParams.data.tags } : {},
      ..."scopes" in queryParams.data ? { scopes: queryParams.data.scopes } : {},
      ..."search" in queryParams.data ? { search: queryParams.data.search } : {},
      ..."authConfigIds" in queryParams.data ? { auth_config_ids: queryParams.data.authConfigIds } : {},
      ...effectiveImportant ? { important: "true" } : {},
      toolkit_versions: this.toolkitVersions
    };
    logger_default.debug(`Fetching tools with filters: ${JSON.stringify(filters, null, 2)}`);
    const tools = await this.client.tools.list(filters);
    if (!tools) return [];
    const caseTransformedTools = tools.items.map((tool) => this.transformToolCases(tool));
    const customTools = await this.customTools.getCustomTools({ toolSlugs: "tools" in queryParams.data ? queryParams.data.tools : void 0 });
    let modifiedTools = await this.applyDefaultSchemaModifiers([...caseTransformedTools, ...customTools]);
    if (options?.modifySchema) {
      const modifier = options.modifySchema;
      if (typeof modifier === "function") {
        const modifiedPromises = modifiedTools.map((tool) => modifier({
          toolSlug: tool.slug,
          toolkitSlug: tool.toolkit?.slug ?? "unknown",
          schema: tool
        }));
        modifiedTools = await Promise.all(modifiedPromises);
      } else throw new ComposioInvalidModifierError("Invalid schema modifier. Not a function.");
    }
    return modifiedTools;
  }
  /**
  * Fetches the meta tools for a tool router session.
  * This method fetches the meta tools from the Composio API and transforms them to the expected format.
  * It provides access to the underlying meta tool data without provider-specific wrapping.
  *
  * @param sessionId {string} The session id to get the meta tools for
  * @param options {SchemaModifierOptions} Optional configuration for tool retrieval
  * @param {TransformToolSchemaModifier} [options.modifySchema] - Function to transform the tool schema
  * @returns {Promise<ToolList>} The list of meta tools
  *
  * @example
  * ```typescript
  * const metaTools = await composio.tools.getRawToolRouterMetaTools('session_123');
  * console.log(metaTools);
  * ```
  */
  async getRawToolRouterMetaTools(sessionId, options) {
    let modifiedTools = (await this.client.toolRouter.session.tools(sessionId)).items.map((tool) => this.transformToolCases(tool));
    if (options?.modifySchema) {
      const modifier = options.modifySchema;
      if (typeof modifier === "function") {
        const modifiedPromises = modifiedTools.map((tool) => modifier({
          toolSlug: tool.slug,
          toolkitSlug: tool.toolkit?.slug ?? "unknown",
          schema: tool
        }));
        modifiedTools = await Promise.all(modifiedPromises);
      } else throw new ComposioInvalidModifierError("Invalid schema modifier. Not a function.");
    }
    return modifiedTools;
  }
  /**
  * Retrieves a specific tool by its slug from the Composio API.
  *
  * This method fetches a single tool in raw format without provider-specific wrapping,
  * providing direct access to the tool's schema and metadata. Tool versions are controlled
  * at the Composio SDK initialization level through the `toolkitVersions` configuration.
  *
  * @param {string} slug - The unique identifier of the tool (e.g., 'GITHUB_GET_REPOS')
  * @param {GetRawComposioToolBySlugOptions} [options] - Optional configuration for tool retrieval
  * @param {TransformToolSchemaModifier} [options.modifySchema] - Function to transform the tool schema
  * @returns {Promise<Tool>} The requested tool with its complete schema and metadata
  *
  * @example
  * ```typescript
  * // Get a tool by slug
  * const tool = await composio.tools.getRawComposioToolBySlug('GITHUB_GET_REPOS');
  * console.log(tool.name, tool.description);
  *
  * // Get a tool with schema transformation
  * const customizedTool = await composio.tools.getRawComposioToolBySlug(
  *   'SLACK_SEND_MESSAGE',
  *   {
  *     modifySchema: ({ toolSlug, toolkitSlug, schema }) => {
  *       return {
  *         ...schema,
  *         description: `Enhanced ${schema.description} with custom modifications`,
  *         customMetadata: {
  *           lastModified: new Date().toISOString(),
  *           toolkit: toolkitSlug
  *         }
  *       };
  *     }
  *   }
  * );
  *
  * // Get a custom tool (will check custom tools first)
  * const customTool = await composio.tools.getRawComposioToolBySlug('MY_CUSTOM_TOOL');
  *
  * // Access tool properties
  * const githubTool = await composio.tools.getRawComposioToolBySlug('GITHUB_CREATE_ISSUE');
  * console.log({
  *   slug: githubTool.slug,
  *   name: githubTool.name,
  *   toolkit: githubTool.toolkit?.name,
  *   version: githubTool.version,
  *   availableVersions: githubTool.availableVersions,
  *   inputParameters: githubTool.inputParameters
  * });
  * ```
  */
  async getRawComposioToolBySlug(slug, options) {
    const customTool = await this.customTools.getCustomToolBySlug(slug);
    if (customTool) {
      logger_default.debug(`Found ${slug} to be a custom tool`, JSON.stringify(customTool, null, 2));
      return customTool;
    } else logger_default.debug(`Tool ${slug} is not a custom tool. Fetching from Composio API`);
    let tool;
    try {
      const retrieveParams = options?.version ? { version: options.version } : { toolkit_versions: this.toolkitVersions };
      tool = await this.client.tools.retrieve(slug, retrieveParams);
    } catch (error) {
      throw new ComposioToolNotFoundError(`Unable to retrieve tool with slug ${slug}`, { cause: error });
    }
    let [modifiedTool] = await this.applyDefaultSchemaModifiers([this.transformToolCases(tool)]);
    if (options?.modifySchema) {
      const modifier = options.modifySchema;
      if (typeof modifier === "function") modifiedTool = await modifier({
        toolSlug: slug,
        toolkitSlug: modifiedTool.toolkit?.slug ?? "unknown",
        schema: modifiedTool
      });
      else throw new ComposioInvalidModifierError("Invalid schema modifier. Not a function.");
    }
    return modifiedTool;
  }
  /**
  * Get a tool or list of tools based on the provided arguments.
  * This is an implementation method that handles all overloads.
  *
  * @param {string} userId - The user id to get the tool(s) for
  * @param {ToolListParams | string} arg2 - Either a slug string or filters object
  * @param {ProviderOptions<TProvider> | ToolkitVersion} [arg3] - Optional provider options or version string
  * @param {ProviderOptions<TProvider>} [arg4] - Optional provider options (when arg3 is version)
  * @returns {Promise<TToolCollection>} The tool collection
  */
  async get(userId, arg2, arg3) {
    const options = arg3;
    if (typeof arg2 === "string") {
      const tool = await this.getRawComposioToolBySlug(arg2, { modifySchema: options?.modifySchema });
      return this.wrapToolsForProvider(userId, [tool], options);
    } else {
      const tools = await this.getRawComposioTools(arg2, { modifySchema: options?.modifySchema });
      return this.wrapToolsForProvider(userId, tools, options);
    }
  }
  /**
  * @internal
  * Creates a global execute tool function.
  * This function is used by providers to execute tools.
  * It skips the version check for provider controlled execution.
  * @returns {GlobalExecuteToolFn} The global execute tool function
  */
  createExecuteFnForProviders() {
    return async (slug, body, modifiers) => {
      return await this.execute(slug, {
        ...body,
        dangerouslySkipVersionCheck: body.dangerouslySkipVersionCheck ?? true
      }, modifiers);
    };
  }
  /**
  * @internal
  * Utility to wrap a given set of tools in the format expected by the provider
  *
  * @param userId - The user id to get the tools for
  * @param tools - The tools to wrap
  * @param modifiers - The modifiers to be applied to the tools
  * @returns The wrapped tools
  */
  wrapToolsForProvider(userId, tools, modifiers) {
    const executeToolFn = this.createExecuteToolFn(userId, modifiers);
    return this.provider.wrapTools(tools, executeToolFn);
  }
  /**
  * @internal
  * Utility to wrap a given set of tools in the format expected by the tool router
  *
  * @param {string} sessionId - The session id to execute the tool for
  * @param {Tool[]} tools - The tools to wrap
  * @param {SessionExecuteMetaModifiers} modifiers - The modifiers to apply to the tool
  * @returns {Tool[]} The wrapped tools
  */
  wrapToolsForToolRouter(sessionId, tools, modifiers) {
    const executeToolFn = this.createExecuteToolFnForToolRouter(sessionId, modifiers);
    return this.provider.wrapTools(tools, executeToolFn);
  }
  /**
  * @internal
  * @description
  * Creates a function that executes a tool.
  * This function is used by agentic providers to execute the tool
  *
  * @param {string} userId - The user id
  * @param {ExecuteToolModifiers} modifiers - The modifiers to be applied to the tool
  * @returns {ExecuteToolFn} The execute tool function
  */
  createExecuteToolFn(userId, modifiers) {
    const executeToolFn = /* @__PURE__ */ __name(async (toolSlug, input) => {
      return await this.execute(toolSlug, {
        userId,
        arguments: input,
        dangerouslySkipVersionCheck: true
      }, modifiers);
    }, "executeToolFn");
    return executeToolFn;
  }
  /**
  * @internal
  * Creates a function that executes a tool for a tool router session
  *
  * @param {string} sessionId - The session id to execute the tool for
  * @param {SessionExecuteMetaModifiers} modifiers - The modifiers to apply to the tool
  * @returns {ExecuteToolFn} The execute tool function
  */
  createExecuteToolFnForToolRouter(sessionId, modifiers) {
    const executeToolFn = /* @__PURE__ */ __name(async (toolSlug, input) => {
      return await this.executeMetaTool(toolSlug, {
        sessionId,
        arguments: input
      }, modifiers);
    }, "executeToolFn");
    return executeToolFn;
  }
  /**
  * @internal
  * Executes a composio tool via API without modifiers
  * @param tool - The tool to execute
  * @param body - The body of the tool execution
  * @returns The response from the tool execution
  */
  async executeComposioTool(tool, body) {
    const toolkitVersion = body.version ?? getToolkitVersion(tool.toolkit?.slug ?? "unknown", this.toolkitVersions);
    if (toolkitVersion === "latest" && !body.dangerouslySkipVersionCheck) throw new ComposioToolVersionRequiredError();
    try {
      const result = await this.client.tools.execute(tool.slug, {
        allow_tracing: body.allowTracing,
        connected_account_id: body.connectedAccountId,
        custom_auth_params: body.customAuthParams,
        custom_connection_data: body.customConnectionData,
        arguments: body.arguments,
        user_id: body.userId,
        version: toolkitVersion,
        text: body.text
      });
      return this.transformToolExecuteResponse(result);
    } catch (error) {
      throw handleToolExecutionError(tool.slug, error);
    }
  }
  /**
  * Executes a given tool with the provided parameters.
  *
  * This method calls the Composio API or a custom tool handler to execute the tool and returns the response.
  * It automatically determines whether to use a custom tool or a Composio API tool based on the slug.
  *
  * **Version Control:**
  * By default, manual tool execution requires a specific toolkit version. If the version resolves to "latest",
  * the execution will throw a `ComposioToolVersionRequiredError` unless `dangerouslySkipVersionCheck` is set to `true`.
  * This helps prevent unexpected behavior when new toolkit versions are released.
  *
  * @param {string} slug - The slug/ID of the tool to be executed
  * @param {ToolExecuteParams} body - The parameters to be passed to the tool
  * @param {string} [body.version] - The specific version of the tool to execute (e.g., "20250909_00")
  * @param {boolean} [body.dangerouslySkipVersionCheck] - Skip version validation for "latest" version (use with caution)
  * @param {string} [body.userId] - The user ID to execute the tool for
  * @param {string} [body.connectedAccountId] - The connected account ID to use for authenticated tools
  * @param {Record<string, unknown>} [body.arguments] - The arguments to pass to the tool
  * @param {ExecuteToolModifiers} [modifiers] - Optional modifiers to transform the request or response
  * @returns {Promise<ToolExecuteResponse>} - The response from the tool execution
  *
  * @throws {ComposioCustomToolsNotInitializedError} If the CustomTools instance is not initialized
  * @throws {ComposioConnectedAccountNotFoundError} If the connected account is not found
  * @throws {ComposioToolNotFoundError} If the tool with the given slug is not found
  * @throws {ComposioToolVersionRequiredError} If version resolves to "latest" and dangerouslySkipVersionCheck is not true
  * @throws {ComposioToolExecutionError} If there is an error during tool execution
  *
  * @example Execute with a specific version (recommended for production)
  * ```typescript
  * const result = await composio.tools.execute('GITHUB_GET_REPOS', {
  *   userId: 'default',
  *   version: '20250909_00',
  *   arguments: { owner: 'composio' }
  * });
  * ```
  *
  * @example Execute with dangerouslySkipVersionCheck (not recommended for production)
  * ```typescript
  * const result = await composio.tools.execute('HACKERNEWS_GET_USER', {
  *   userId: 'default',
  *   arguments: { userId: 'pg' },
  *   dangerouslySkipVersionCheck: true // Allows execution with "latest" version
  * });
  * ```
  *
  * @example Execute with SDK-level toolkit versions configuration
  * ```typescript
  * // If toolkitVersions are set during Composio initialization, no need to pass version
  * const composio = new Composio({ toolkitVersions: { github: '20250909_00' } });
  * const result = await composio.tools.execute('GITHUB_GET_REPOS', {
  *   userId: 'default',
  *   arguments: { owner: 'composio' }
  * });
  * ```
  *
  * @example Execute with modifiers
  * ```typescript
  * const result = await composio.tools.execute('GITHUB_GET_ISSUES', {
  *   userId: 'default',
  *   version: '20250909_00',
  *   arguments: { owner: 'composio', repo: 'sdk' }
  * }, {
  *   beforeExecute: ({ toolSlug, toolkitSlug, params }) => {
  *     console.log(`Executing ${toolSlug} from ${toolkitSlug}`);
  *     return params;
  *   },
  *   afterExecute: ({ toolSlug, toolkitSlug, result }) => {
  *     console.log(`Completed ${toolSlug}`);
  *     return result;
  *   }
  * });
  * ```
  */
  async execute(slug, body, modifiers) {
    if (!this.customTools) throw new ComposioCustomToolsNotInitializedError("CustomTools not initialized. Make sure Tools class is properly constructed.");
    const executeParams = ToolExecuteParamsSchema.safeParse(body);
    if (!executeParams.success) throw new ValidationError("Invalid tool execute parameters", { cause: executeParams.error });
    const customTool = await this.customTools.getCustomToolBySlug(slug);
    const tool = customTool ?? await this.getRawComposioToolBySlug(slug, { version: body.version });
    const toolkitSlug = tool.toolkit?.slug ?? "unknown";
    const params = await this.applyBeforeExecuteModifiers(tool, {
      toolSlug: slug,
      toolkitSlug,
      params: executeParams.data
    }, modifiers?.beforeExecute);
    let result = customTool ? await this.customTools.executeCustomTool(customTool.slug, params) : await this.executeComposioTool(tool, params);
    result = await this.applyAfterExecuteModifiers(tool, {
      toolSlug: slug,
      toolkitSlug,
      result
    }, modifiers?.afterExecute);
    return result;
  }
  /**
  * Executes a composio meta tool based on tool router session
  *
  * @param {string} toolSlug - The slug of the tool to execute
  * @param {ToolExecuteMetaParams} body - The execution parameters
  * @param {string} body.sessionId - The session id to execute the tool for
  * @param {Record<string, unknown>} body.arguments - The input to pass to the tool
  * @param {SessionExecuteMetaModifiers} modifiers - The modifiers to apply to the tool
  * @returns {Promise<ToolExecuteResponse>} The response from the tool execution
  */
  async executeMetaTool(toolSlug, body, modifiers) {
    const executeMetaParams = ToolExecuteMetaParamsSchema.safeParse(body);
    if (!executeMetaParams.success) throw new ValidationError("Invalid tool execute meta parameters", { cause: executeMetaParams.error });
    let modifiedParams = body.arguments ?? {};
    if (modifiers?.beforeExecute) modifiedParams = await modifiers.beforeExecute({
      toolSlug,
      toolkitSlug: "composio",
      sessionId: body.sessionId,
      params: modifiedParams
    });
    const response = await this.client.toolRouter.session.executeMeta(body.sessionId, {
      slug: toolSlug,
      arguments: modifiedParams
    });
    let result = {
      data: response.data,
      error: response.error,
      successful: !response.error,
      logId: response.log_id
    };
    if (modifiers?.afterExecute) result = await modifiers.afterExecute({
      toolSlug,
      toolkitSlug: "composio",
      sessionId: body.sessionId,
      result
    });
    return result;
  }
  /**
  * Fetches the list of all available tools in the Composio SDK.
  *
  * This method is mostly used by the CLI to get the list of tools.
  * No filtering is done on the tools, the list is cached in the backend, no further optimization is required.
  * @returns {Promise<ToolRetrieveEnumResponse>} The complete list of all available tools with their metadata
  *
  * @example
  * ```typescript
  * // Get all available tools as an enum
  * const toolsEnum = await composio.tools.getToolsEnum();
  * console.log(toolsEnum.items);
  * ```
  */
  async getToolsEnum() {
    return this.client.tools.retrieveEnum();
  }
  /**
  * Fetches the input parameters for a given tool.
  *
  * This method is used to get the input parameters for a tool before executing it.
  *
  * @param {string} slug - The ID of the tool to find input for
  * @param {ToolGetInputParams} body - The parameters to be passed to the tool
  * @returns {Promise<ToolGetInputResponse>} The input parameters schema for the specified tool
  *
  * @example
  * ```typescript
  * // Get input parameters for a specific tool
  * const inputParams = await composio.tools.getInput('GITHUB_CREATE_ISSUE', {
  *   userId: 'default'
  * });
  * console.log(inputParams.schema);
  * ```
  */
  async getInput(slug, body) {
    return this.client.tools.getInput(slug, body);
  }
  /**
  * Proxies a custom request to a toolkit/integration.
  *
  * This method allows sending custom requests to a specific toolkit or integration
  * when you need more flexibility than the standard tool execution methods provide.
  *
  * @param {ToolProxyParams} body - The parameters for the proxy request including toolkit slug and custom data
  * @returns {Promise<ToolProxyResponse>} The response from the proxied request
  *
  * @example
  * ```typescript
  * // Send a custom request to a toolkit
  * const response = await composio.tools.proxyExecute({
  *   toolkitSlug: 'github',
  *   userId: 'default',
  *   data: {
  *     endpoint: '/repos/owner/repo/issues',
  *     method: 'GET'
  *   }
  * });
  * console.log(response.data);
  * ```
  */
  async proxyExecute(body) {
    const toolProxyParams = ToolProxyParamsSchema.safeParse(body);
    if (!toolProxyParams.success) throw new ValidationError("Invalid tool proxy parameters", { cause: toolProxyParams.error });
    const parameters = [];
    const parameterTypes = {
      header: "header",
      query: "query"
    };
    if (toolProxyParams.data.parameters) parameters.push(...(toolProxyParams.data.parameters ?? []).map((value) => ({
      name: value.name,
      type: value.in === "header" ? parameterTypes.header : parameterTypes.query,
      value: value.value.toString()
    })));
    return this.client.tools.proxy({
      endpoint: toolProxyParams.data.endpoint,
      method: toolProxyParams.data.method,
      body: toolProxyParams.data.body,
      connected_account_id: toolProxyParams.data.connectedAccountId,
      parameters,
      custom_connection_data: toolProxyParams.data.customConnectionData
    });
  }
  /**
  * Creates a custom tool that can be used within the Composio SDK.
  *
  * Custom tools allow you to extend the functionality of Composio with your own implementations
  * while keeping a consistent interface for both built-in and custom tools.
  *
  * @param {CustomToolOptions} body - The configuration for the custom tool
  * @returns {Promise<Tool>} The created custom tool
  *
  * @example
  * ```typescript
  * // creating a custom tool with a toolkit
  * await composio.tools.createCustomTool({
  *   name: 'My Custom Tool',
  *   description: 'A custom tool that does something specific',
  *   slug: 'MY_CUSTOM_TOOL',
  *   userId: 'default',
  *   connectedAccountId: '123',
  *   toolkitSlug: 'github',
  *   inputParameters: z.object({
  *     param1: z.string().describe('First parameter'),
  *   }),
  *   execute: async (input, connectionConfig, executeToolRequest) => {
  *     // Custom logic here
  *     return { data: { result: 'Success!' } };
  *   }
  * });
  * ```
  *
  * @example
  * ```typescript
  * // creating a custom tool without a toolkit
  * await composio.tools.createCustomTool({
  *   name: 'My Custom Tool',
  *   description: 'A custom tool that does something specific',
  *   slug: 'MY_CUSTOM_TOOL',
  *   inputParameters: z.object({
  *     param1: z.string().describe('First parameter'),
  *   }),
  *   execute: async (input) => {
  *     // Custom logic here
  *     return { data: { result: 'Success!' } };
  *   }
  * });
  */
  async createCustomTool(body) {
    return this.customTools.createTool(body);
  }
};
var ToolkitMangedByEnumSchema = external_exports.enum([
  "all",
  "composio",
  "project"
]);
var ToolkitSortByEnumSchema = external_exports.enum(["usage", "alphabetically"]);
var ToolkitsListParamsSchema = external_exports.object({
  category: external_exports.string().optional(),
  managedBy: ToolkitMangedByEnumSchema.optional(),
  sortBy: ToolkitSortByEnumSchema.optional(),
  cursor: external_exports.string().optional(),
  limit: external_exports.number().optional()
});
var ToolKitMetaSchema = external_exports.object({
  categories: external_exports.array(external_exports.object({
    slug: external_exports.string(),
    name: external_exports.string()
  })).optional(),
  appUrl: external_exports.string().optional(),
  createdAt: external_exports.string().optional(),
  description: external_exports.string().optional(),
  logo: external_exports.string().optional(),
  toolsCount: external_exports.number().optional(),
  triggersCount: external_exports.number().optional(),
  updatedAt: external_exports.string().optional(),
  availableVersions: external_exports.array(external_exports.string()).optional()
});
var ToolKitItemSchema = external_exports.object({
  name: external_exports.string(),
  slug: external_exports.string(),
  meta: ToolKitMetaSchema,
  isLocalToolkit: external_exports.boolean(),
  authSchemes: external_exports.array(external_exports.string()).optional(),
  composioManagedAuthSchemes: external_exports.array(external_exports.string()).optional(),
  noAuth: external_exports.boolean().optional()
});
var ToolKitListResponseSchema = external_exports.array(ToolKitItemSchema);
var ToolkitAuthFieldSchema = external_exports.object({
  description: external_exports.string(),
  displayName: external_exports.string(),
  required: external_exports.boolean(),
  name: external_exports.string(),
  type: external_exports.string(),
  default: external_exports.string().nullable().optional()
});
var ToolkitAuthConfigDetailsSchema = external_exports.object({
  name: external_exports.string(),
  mode: external_exports.string(),
  fields: external_exports.object({
    authConfigCreation: external_exports.object({
      optional: external_exports.array(ToolkitAuthFieldSchema),
      required: external_exports.array(ToolkitAuthFieldSchema)
    }),
    connectedAccountInitiation: external_exports.object({
      optional: external_exports.array(ToolkitAuthFieldSchema),
      required: external_exports.array(ToolkitAuthFieldSchema)
    })
  }),
  proxy: external_exports.object({ baseUrl: external_exports.string().optional() }).optional()
});
var ToolkitRetrieveResponseSchema = external_exports.object({
  name: external_exports.string(),
  slug: external_exports.string(),
  meta: ToolKitMetaSchema,
  isLocalToolkit: external_exports.boolean(),
  composioManagedAuthSchemes: external_exports.array(external_exports.string()).optional(),
  authConfigDetails: external_exports.array(ToolkitAuthConfigDetailsSchema).optional(),
  baseUrl: external_exports.string().optional(),
  getCurrentUserEndpoint: external_exports.string().optional(),
  getCurrentUserEndpointMethod: external_exports.string().optional()
});
var ToolkitCategorySchema = external_exports.object({
  id: external_exports.string(),
  name: external_exports.string()
});
var ToolkitRetrieveCategoriesResponseSchema = external_exports.object({
  items: external_exports.array(ToolkitCategorySchema),
  nextCursor: external_exports.string().nullable(),
  totalPages: external_exports.number()
});
var ToolkitAuthFieldsResponseSchema = external_exports.array(ToolkitAuthFieldSchema.extend({ required: external_exports.boolean().optional() }));
function transformAuthConfigRetrieveResponse(authConfig) {
  return transform(authConfig).with(AuthConfigRetrieveResponseSchema).using((authConfig$1) => ({
    id: authConfig$1.id,
    name: authConfig$1.name,
    noOfConnections: authConfig$1.no_of_connections,
    status: authConfig$1.status,
    toolkit: {
      logo: authConfig$1.toolkit.logo,
      slug: authConfig$1.toolkit.slug
    },
    isEnabledForToolRouter: authConfig$1.is_enabled_for_tool_router,
    uuid: authConfig$1.uuid,
    authScheme: authConfig$1.auth_scheme,
    credentials: authConfig$1.credentials,
    expectedInputFields: authConfig$1.expected_input_fields,
    isComposioManaged: authConfig$1.is_composio_managed,
    createdBy: authConfig$1.created_by,
    createdAt: authConfig$1.created_at,
    lastUpdatedAt: authConfig$1.last_updated_at,
    restrictToFollowingTools: authConfig$1.tool_access_config?.tools_for_connected_account_creation,
    toolAccessConfig: authConfig$1.tool_access_config ? {
      toolsAvailableForExecution: authConfig$1.tool_access_config.tools_available_for_execution,
      toolsForConnectedAccountCreation: authConfig$1.tool_access_config.tools_for_connected_account_creation
    } : void 0
  }));
}
__name(transformAuthConfigRetrieveResponse, "transformAuthConfigRetrieveResponse");
function transformAuthConfigListResponse(response) {
  return transform(response).with(AuthConfigListResponseSchema).using((response$1) => ({
    items: response$1.items.map(transformAuthConfigRetrieveResponse),
    nextCursor: response$1.next_cursor ?? null,
    totalPages: response$1.total_pages
  }));
}
__name(transformAuthConfigListResponse, "transformAuthConfigListResponse");
function transformCreateAuthConfigResponse(response) {
  return transform(response).with(CreateAuthConfigResponseSchema).using((response$1) => ({
    id: response$1.auth_config.id,
    authScheme: response$1.auth_config.auth_scheme,
    isComposioManaged: response$1.auth_config.is_composio_managed,
    toolkit: response$1.toolkit.slug
  }));
}
__name(transformCreateAuthConfigResponse, "transformCreateAuthConfigResponse");
var AuthConfigs2 = class {
  static {
    __name(this, "AuthConfigs");
  }
  client;
  constructor(client) {
    this.client = client;
    telemetry.instrument(this, "AuthConfigs");
  }
  /**
  * Protected getter for the client instance.
  * This is primarily used for testing purposes.
  * @protected
  */
  getClient() {
    return this.client;
  }
  /**
  * Lists authentication configurations based on provided filter criteria.
  *
  * This method retrieves auth configs from the Composio API, transforms them to the SDK format,
  * and supports filtering by various parameters.
  *
  * @param {AuthConfigListParams} [query] - Optional query parameters for filtering auth configs
  * @returns {Promise<AuthConfigListResponse>} A paginated list of auth configurations
  * @throws {ValidationError} If the query parameters or response fail validation
  *
  * @example
  * ```typescript
  * // List all auth configs
  * const allConfigs = await composio.authConfigs.list();
  *
  * // List auth configs for a specific toolkit
  * const githubConfigs = await composio.authConfigs.list({
  *   toolkit: 'github'
  * });
  *
  * // List Composio-managed auth configs
  * const managedConfigs = await composio.authConfigs.list({
  *   isComposioManaged: true
  * });
  * ```
  */
  async list(query) {
    const parsedQuery = query ? AuthConfigListParamsSchema.parse(query) : void 0;
    return transformAuthConfigListResponse(await this.client.authConfigs.list({
      cursor: parsedQuery?.cursor,
      is_composio_managed: parsedQuery?.isComposioManaged,
      limit: parsedQuery?.limit,
      toolkit_slug: parsedQuery?.toolkit
    }));
  }
  /**
  * Create a new auth config
  * @param {string} toolkit - Unique identifier of the toolkit
  * @param {CreateAuthConfigParams} options - Options for creating a new auth config
  * @returns {Promise<CreateAuthConfigResponse>} Created auth config
  *
  * @example
  * const authConfig = await authConfigs.create('my-toolkit', {
  *   type: AuthConfigTypes.CUSTOM,
  *   name: 'My Custom Auth Config',
  *   authScheme: AuthSchemeTypes.API_KEY,
  *   credentials: {
  *     apiKey: '1234567890',
  *   },
  * });
  *
  * @link https://docs.composio.dev/reference/auth-configs/create-auth-config
  */
  async create(toolkit, options = { type: "use_composio_managed_auth" }) {
    const parsedOptions = CreateAuthConfigParamsSchema.safeParse(options);
    if (parsedOptions.error) throw new ValidationError("Failed to parse auth config create options", { cause: parsedOptions.error });
    return transformCreateAuthConfigResponse(await this.client.authConfigs.create({
      toolkit: { slug: toolkit },
      auth_config: parsedOptions.data.type === "use_custom_auth" ? {
        type: parsedOptions.data.type,
        name: parsedOptions.data.name,
        authScheme: parsedOptions.data.authScheme,
        credentials: parsedOptions.data.credentials,
        is_enabled_for_tool_router: parsedOptions.data.isEnabledForToolRouter,
        proxy_config: parsedOptions.data.proxyConfig ? {
          proxy_url: parsedOptions.data.proxyConfig.proxyUrl,
          proxy_auth_key: parsedOptions.data.proxyConfig.proxyAuthKey
        } : void 0,
        tool_access_config: parsedOptions.data.toolAccessConfig ? { tools_for_connected_account_creation: parsedOptions.data.toolAccessConfig.toolsForConnectedAccountCreation } : void 0
      } : {
        type: parsedOptions.data.type,
        credentials: parsedOptions.data.credentials,
        name: parsedOptions.data.name,
        is_enabled_for_tool_router: parsedOptions.data.isEnabledForToolRouter,
        tool_access_config: parsedOptions.data.toolAccessConfig ? { tools_for_connected_account_creation: parsedOptions.data.toolAccessConfig.toolsForConnectedAccountCreation } : void 0
      }
    }));
  }
  /**
  * Retrieves a specific authentication configuration by its ID.
  *
  * This method fetches detailed information about a single auth config
  * and transforms the response to the SDK's standardized format.
  *
  * @param {string} nanoid - The unique identifier of the auth config to retrieve
  * @returns {Promise<AuthConfigRetrieveResponse>} The auth config details
  * @throws {Error} If the auth config cannot be found or an API error occurs
  * @throws {ValidationError} If the response fails validation
  *
  * @example
  * ```typescript
  * // Get an auth config by ID
  * const authConfig = await composio.authConfigs.get('auth_abc123');
  * console.log(authConfig.name); // e.g., 'GitHub Auth'
  * console.log(authConfig.toolkit.slug); // e.g., 'github'
  * ```
  */
  async get(nanoid) {
    return transformAuthConfigRetrieveResponse(await this.client.authConfigs.retrieve(nanoid));
  }
  /**
  * Updates an existing authentication configuration.
  *
  * This method allows you to modify properties of an auth config such as credentials,
  * scopes, or tool restrictions. The update type (custom or default) determines which
  * fields can be updated.
  *
  * @param {string} nanoid - The unique identifier of the auth config to update
  * @param {AuthConfigUpdateParams} data - The data to update, which can be either custom or default type
  * @returns {Promise<AuthConfigUpdateResponse>} The updated auth config
  * @throws {ValidationError} If the update parameters are invalid
  * @throws {Error} If the auth config cannot be found or updated
  *
  * @example
  * ```typescript
  * // Update a custom auth config with new credentials
  * const updatedConfig = await composio.authConfigs.update('auth_abc123', {
  *   type: 'custom',
  *   credentials: {
  *     apiKey: 'new-api-key-value'
  *   }
  * });
  *
  * // Update a default auth config with new scopes
  * const updatedConfig = await composio.authConfigs.update('auth_abc123', {
  *   type: 'default',
  *   scopes: ['read:user', 'repo']
  * });
  * ```
  */
  async update(nanoid, data) {
    const parsedData = AuthConfigUpdateParamsSchema.safeParse(data);
    if (parsedData.error) throw new ValidationError("Failed to parse auth config update data", { cause: parsedData.error });
    return this.client.authConfigs.update(nanoid, parsedData.data.type === "custom" ? {
      type: "custom",
      credentials: parsedData.data.credentials,
      is_enabled_for_tool_router: parsedData.data.isEnabledForToolRouter,
      tool_access_config: {
        tools_for_connected_account_creation: parsedData.data.toolAccessConfig?.toolsForConnectedAccountCreation,
        tools_available_for_execution: parsedData.data.toolAccessConfig?.toolsAvailableForExecution ?? parsedData.data.restrictToFollowingTools
      }
    } : {
      type: "default",
      scopes: parsedData.data.scopes,
      is_enabled_for_tool_router: parsedData.data.isEnabledForToolRouter,
      tool_access_config: {
        tools_for_connected_account_creation: parsedData.data.toolAccessConfig?.toolsForConnectedAccountCreation,
        tools_available_for_execution: parsedData.data.toolAccessConfig?.toolsAvailableForExecution ?? parsedData.data.restrictToFollowingTools
      }
    });
  }
  /**
  * Deletes an authentication configuration.
  *
  * This method permanently removes an auth config from the Composio platform.
  * This action cannot be undone and will prevent any connected accounts that use
  * this auth config from functioning.
  *
  * @param {string} nanoid - The unique identifier of the auth config to delete
  * @returns {Promise<AuthConfigDeleteResponse>} The deletion response
  * @throws {Error} If the auth config doesn't exist or cannot be deleted
  *
  * @example
  * ```typescript
  * // Delete an auth config
  * await composio.authConfigs.delete('auth_abc123');
  * ```
  */
  async delete(nanoid) {
    return this.client.authConfigs.delete(nanoid);
  }
  /**
  * Updates the status of an authentication configuration.
  *
  * This method allows you to enable or disable an auth config. When disabled,
  * the auth config cannot be used to create new connected accounts or authenticate
  * with third-party services.
  *
  * @param {string} status - The status to set ('ENABLED' or 'DISABLED')
  * @param {string} nanoid - The unique identifier of the auth config
  * @returns {Promise<AuthConfigUpdateStatusResponse>} The updated auth config details
  * @throws {Error} If the auth config cannot be found or the status cannot be updated
  *
  * @example
  * ```typescript
  * // Disable an auth config
  * await composio.authConfigs.updateStatus('DISABLED', 'auth_abc123');
  *
  * // Enable an auth config
  * await composio.authConfigs.updateStatus('ENABLED', 'auth_abc123');
  * ```
  */
  async updateStatus(status, nanoid) {
    return this.client.authConfigs.updateStatus(status, { nanoid });
  }
  /**
  * Enables an authentication configuration.
  *
  * This is a convenience method that calls updateStatus with 'ENABLED'.
  * When enabled, the auth config can be used to create new connected accounts
  * and authenticate with third-party services.
  *
  * @param {string} nanoid - The unique identifier of the auth config to enable
  * @returns {Promise<AuthConfigUpdateStatusResponse>} The updated auth config details
  * @throws {Error} If the auth config cannot be found or enabled
  *
  * @example
  * ```typescript
  * // Enable an auth config
  * await composio.authConfigs.enable('auth_abc123');
  * ```
  */
  async enable(nanoid) {
    return this.client.authConfigs.updateStatus("ENABLED", { nanoid });
  }
  /**
  * Disables an authentication configuration.
  *
  * This is a convenience method that calls updateStatus with 'DISABLED'.
  * When disabled, the auth config cannot be used to create new connected accounts
  * or authenticate with third-party services, but existing connections may continue to work.
  *
  * @param {string} nanoid - The unique identifier of the auth config to disable
  * @returns {Promise<AuthConfigUpdateStatusResponse>} The updated auth config details
  * @throws {Error} If the auth config cannot be found or disabled
  *
  * @example
  * ```typescript
  * // Disable an auth config
  * await composio.authConfigs.disable('auth_abc123');
  * ```
  */
  async disable(nanoid) {
    return this.client.authConfigs.updateStatus("DISABLED", { nanoid });
  }
};
function createConnectionRequest(client, connectedAccountId, status, redirectUrl) {
  const state = {
    id: connectedAccountId,
    status: status || ConnectedAccountStatuses.INITIATED,
    redirectUrl
  };
  telemetry.instrument(state, "ConnectionRequest");
  async function waitForConnection(timeout = 6e4) {
    try {
      const response = await client.connectedAccounts.retrieve(state.id);
      if (response.status === ConnectedAccountStatuses.ACTIVE) {
        state.status = ConnectedAccountStatuses.ACTIVE;
        return transformConnectedAccountResponse(response);
      }
    } catch (error) {
      if (error instanceof Composio.NotFoundError) throw new ComposioConnectedAccountNotFoundError(`Connected account with id ${state.id} not found`, { meta: { connectedAccountId: state.id } });
      else throw error;
    }
    const terminalErrorStates = [ConnectedAccountStatuses.FAILED, ConnectedAccountStatuses.EXPIRED];
    const start = Date.now();
    const pollInterval = 1e3;
    while (Date.now() - start < timeout) try {
      const response = await client.connectedAccounts.retrieve(state.id);
      state.status = response.status;
      if (response.status === ConnectedAccountStatuses.ACTIVE) return transformConnectedAccountResponse(response);
      if (terminalErrorStates.includes(response.status)) throw new ConnectionRequestFailedError(`Connection request failed with status: ${response.status}${response.status_reason ? `, reason: ${response.status_reason}` : ""}`, { meta: {
        connectedAccountId: state.id,
        status: response.status,
        statusReason: response.status_reason
      } });
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      throw error;
    }
    throw new ConnectionRequestTimeoutError(`Connection request timed out for ${state.id}`);
  }
  __name(waitForConnection, "waitForConnection");
  return {
    ...state,
    waitForConnection,
    toJSON: /* @__PURE__ */ __name(() => ({ ...state }), "toJSON"),
    toString: /* @__PURE__ */ __name(() => JSON.stringify(state, null, 2), "toString")
  };
}
__name(createConnectionRequest, "createConnectionRequest");
var ConnectedAccounts2 = class {
  static {
    __name(this, "ConnectedAccounts");
  }
  client;
  constructor(client) {
    this.client = client;
    telemetry.instrument(this, "ConnectedAccounts");
  }
  /**
  * Lists all connected accounts based on provided filter criteria.
  *
  * This method retrieves connected accounts from the Composio API with optional filtering.
  *
  * @param {ConnectedAccountListParams} [query] - Optional query parameters for filtering connected accounts
  * @returns {Promise<ConnectedAccountListResponse>} A paginated list of connected accounts
  * @throws {ValidationError} If the query fails validation against the expected schema
  * @example
  * ```typescript
  * // List all connected accounts
  * const allAccounts = await composio.connectedAccounts.list();
  *
  * // List accounts for a specific user
  * const userAccounts = await composio.connectedAccounts.list({
  *   userIds: ['user123']
  * });
  *
  * // List accounts for a specific toolkit
  * const githubAccounts = await composio.connectedAccounts.list({
  *   toolkitSlugs: ['github']
  * });
  * ```
  */
  async list(query) {
    let rawQuery = void 0;
    if (query) {
      const parsedQuery = ConnectedAccountListParamsSchema.safeParse(query);
      if (!parsedQuery.success) throw new ValidationError("Failed to parse connected account list query", { cause: parsedQuery.error });
      rawQuery = {
        auth_config_ids: parsedQuery.data.authConfigIds,
        cursor: parsedQuery.data.cursor?.toString(),
        limit: parsedQuery.data.limit,
        order_by: parsedQuery.data.orderBy,
        statuses: parsedQuery.data.statuses,
        toolkit_slugs: parsedQuery.data.toolkitSlugs,
        user_ids: parsedQuery.data.userIds
      };
    }
    return transformConnectedAccountListResponse(await this.client.connectedAccounts.list(rawQuery));
  }
  /**
  * Compound function to create a new connected account.
  * This function creates a new connected account and returns a connection request.
  * Users can then wait for the connection to be established using the `waitForConnection` method.
  *
  * @param {string} userId - User ID of the connected account
  * @param {string} authConfigId - Auth config ID of the connected account
  * @param {CreateConnectedAccountOptions} options - Options for creating a new connected account
  * @returns {Promise<ConnectionRequest>} Connection request object
  *
  * @example
  * ```typescript
  * // For OAuth2 authentication
  * const connectionRequest = await composio.connectedAccounts.initiate(
  *   'user_123',
  *   'auth_config_123',
  *   {
  *     callbackUrl: 'https://your-app.com/callback',
  *     config: AuthScheme.OAuth2({
  *       access_token: 'your_access_token',
  *       token_type: 'Bearer'
  *     })
  *   }
  * );
  *
  * // For API Key authentication
  * const connectionRequest = await composio.connectedAccounts.initiate(
  *   'user_123',
  *   'auth_config_123',
  *   {
  *     config: AuthScheme.ApiKey({
  *       api_key: 'your_api_key'
  *     })
  *   }
  * );
  *
  * // For Basic authentication
  * const connectionRequest = await composio.connectedAccounts.initiate(
  *   'user_123',
  *   'auth_config_123',
  *   {
  *     config: AuthScheme.Basic({
  *       username: 'your_username',
  *       password: 'your_password'
  *     })
  *   }
  * );
  * ```
  *
  * @link https://docs.composio.dev/reference/connected-accounts/create-connected-account
  */
  async initiate(userId, authConfigId, options) {
    const connectedAccount = await this.list({
      userIds: [userId],
      authConfigIds: [authConfigId],
      statuses: [ConnectedAccountStatuses.ACTIVE]
    });
    if (connectedAccount.items.length > 0 && !options?.allowMultiple) throw new ComposioMultipleConnectedAccountsError(`Multiple connected accounts found for user ${userId} in auth config ${authConfigId}. Please use the allowMultiple option to allow multiple connected accounts.`);
    else if (connectedAccount.items.length > 0) logger_default.warn(`[Warn:AllowMultiple] Multiple connected accounts found for user ${userId} in auth config ${authConfigId}`);
    const state = options?.config ?? void 0;
    const response = await this.client.connectedAccounts.create({
      auth_config: { id: authConfigId },
      connection: {
        callback_url: options?.callbackUrl,
        user_id: userId,
        state
      }
    });
    const redirectUrl = typeof response.connectionData?.val?.redirectUrl === "string" ? response.connectionData.val.redirectUrl : null;
    return createConnectionRequest(this.client, response.id, response.connectionData.val.status, redirectUrl);
  }
  /**
  * @description Create a Composio Connect Link for a user to connect their account to a given auth config. This method will return an external link which you can use the user to connect their account.
  *
  * @docs https://docs.composio.dev/reference/connected-accounts/create-connected-account#create-a-composio-connect-link
  *
  * @param userId {string} - The external user ID to create the connected account for.
  * @param authConfigId {string} - The auth config ID to create the connected account for.
  * @param options {CreateConnectedAccountOptions} - Options for creating a new connected account.
  * @param options.callbackUrl {string} - The url to redirect the user to post connecting their account.
  * @returns {ConnectionRequest} Connection request object
  *
  * @example
  * ```typescript
  * // create a connection request and redirect the user to the redirect url
  * const connectionRequest = await composio.connectedAccounts.link('user_123', 'auth_config_123');
  * const redirectUrl = connectionRequest.redirectUrl;
  * console.log(`Visit: ${redirectUrl} to authenticate your account`);
  *
  * // Wait for the connection to be established
  * const connectedAccount = await connectionRequest.waitForConnection()
  * ```
  *
  * @example
  * ```typescript
  * // create a connection request and redirect the user to the redirect url
  * const connectionRequest = await composio.connectedAccounts.link('user_123', 'auth_config_123', {
  *   callbackUrl: 'https://your-app.com/callback'
  * });
  * const redirectUrl = connectionRequest.redirectUrl;
  * console.log(`Visit: ${redirectUrl} to authenticate your account`);
  *
  * // Wait for the connection to be established
  * const connectedAccount = await composio.connectedAccounts.waitForConnection(connectionRequest.id);
  * ```
  */
  async link(userId, authConfigId, options) {
    const requestOptions = await CreateConnectedAccountLinkOptionsSchema.safeParse(options || {});
    if (!requestOptions.success) throw new ValidationError("Failed to parse create connected account link options", { cause: requestOptions.error });
    try {
      const response = await this.client.link.create({
        auth_config_id: authConfigId,
        user_id: userId,
        ...requestOptions?.data.callbackUrl && { callback_url: requestOptions.data.callbackUrl }
      });
      return createConnectionRequest(this.client, response.connected_account_id, ConnectedAccountStatuses.INITIATED, response.redirect_url);
    } catch (error) {
      throw new ComposioFailedToCreateConnectedAccountLink("Failed to create connected account link", { cause: error });
    }
  }
  /**
  * Waits for a connection request to complete and become active.
  *
  * This method continuously polls the Composio API to check the status of a connection
  * until it either becomes active, enters a terminal error state, or times out.
  *
  * @param {string} connectedAccountId - The ID of the connected account to wait for
  * @param {number} [timeout=60000] - Maximum time to wait in milliseconds (default: 60 seconds)
  * @returns {Promise<ConnectedAccountRetrieveResponse>} The finalized connected account data
  * @throws {ComposioConnectedAccountNotFoundError} If the connected account cannot be found
  * @throws {ConnectionRequestFailedError} If the connection enters a failed, expired, or deleted state
  * @throws {ConnectionRequestTimeoutError} If the connection does not complete within the timeout period
  *
  * @example
  * ```typescript
  * // Wait for a connection to complete with default timeout
  * const connectedAccount = await composio.connectedAccounts.waitForConnection('conn_123abc');
  *
  * // Wait with a custom timeout of 2 minutes
  * const connectedAccount = await composio.connectedAccounts.waitForConnection('conn_123abc', 120000);
  * ```
  */
  async waitForConnection(connectedAccountId, timeout = 6e4) {
    return createConnectionRequest(this.client, connectedAccountId).waitForConnection(timeout);
  }
  /**
  * Retrieves a specific connected account by its ID.
  *
  * This method fetches detailed information about a single connected account
  * and transforms the response to the SDK's standardized format.
  *
  * @param {string} nanoid - The unique identifier of the connected account
  * @returns {Promise<ConnectedAccountRetrieveResponse>} The connected account details
  * @throws {Error} If the connected account cannot be found or an API error occurs
  *
  * @example
  * ```typescript
  * // Get a connected account by ID
  * const account = await composio.connectedAccounts.get('conn_abc123');
  * console.log(account.status); // e.g., 'ACTIVE'
  * console.log(account.toolkit.slug); // e.g., 'github'
  * ```
  */
  async get(nanoid) {
    return transformConnectedAccountResponse(await this.client.connectedAccounts.retrieve(nanoid));
  }
  /**
  * Deletes a connected account.
  *
  * This method permanently removes a connected account from the Composio platform.
  * This action cannot be undone and will revoke any access tokens associated with the account.
  *
  * @param {string} nanoid - The unique identifier of the connected account to delete
  * @returns {Promise<ConnectedAccountDeleteResponse>} The deletion response
  * @throws {Error} If the account doesn't exist or cannot be deleted
  *
  * @example
  * ```typescript
  * // Delete a connected account
  * await composio.connectedAccounts.delete('conn_abc123');
  * ```
  */
  async delete(nanoid) {
    return this.client.connectedAccounts.delete(nanoid);
  }
  /**
  * Refreshes a connected account's authentication credentials.
  *
  * This method attempts to refresh OAuth tokens or other credentials associated with
  * the connected account. This is useful when a token has expired or is about to expire.
  *
  * @param {string} nanoid - The unique identifier of the connected account to refresh
  * @returns {Promise<ConnectedAccountRefreshResponse>} The response containing the refreshed account details
  * @throws {Error} If the account doesn't exist or credentials cannot be refreshed
  *
  * @example
  * ```typescript
  * // Refresh a connected account's credentials
  * const refreshedAccount = await composio.connectedAccounts.refresh('conn_abc123');
  * ```
  */
  async refresh(nanoid, options) {
    let params = void 0;
    if (options) {
      const parsedOptions = ConnectedAccountRefreshOptionsSchema.safeParse(options);
      if (!parsedOptions.success) throw new ValidationError("Failed to parse connected account refresh options", { cause: parsedOptions.error });
      params = {
        query_redirect_url: parsedOptions.data.redirectUrl,
        validate_credentials: parsedOptions.data.validateCredentials
      };
    }
    return this.client.connectedAccounts.refresh(nanoid, params);
  }
  /**
  * Update the status of a connected account
  * @param {string} nanoid - Unique identifier of the connected account
  * @param {ConnectedAccountUpdateStatusParams} params - Parameters for updating the status
  * @returns {Promise<ConnectedAccountUpdateStatusResponse>} Updated connected account details
  *
  * @example
  * ```typescript
  * // Enable a connected account
  * const updatedAccount = await composio.connectedAccounts.updateStatus('conn_abc123', {
  *   enabled: true
  * });
  *
  * // Disable a connected account with a reason
  * const disabledAccount = await composio.connectedAccounts.updateStatus('conn_abc123', {
  *   enabled: false,
  *   reason: 'Token expired'
  * });
  * ```
  */
  async updateStatus(nanoid, params) {
    return this.client.connectedAccounts.updateStatus(nanoid, params);
  }
  /**
  * Enable a connected account
  * @param {string} nanoid - Unique identifier of the connected account
  * @returns {Promise<ConnectedAccountUpdateStatusResponse>} Updated connected account details
  *
  * @example
  * ```typescript
  * // Enable a previously disabled connected account
  * const enabledAccount = await composio.connectedAccounts.enable('conn_abc123');
  * console.log(enabledAccount.isDisabled); // false
  * ```
  */
  async enable(nanoid) {
    return this.client.connectedAccounts.updateStatus(nanoid, { enabled: true });
  }
  /**
  * Disable a connected account
  * @param {string} nanoid - Unique identifier of the connected account
  * @returns {Promise<ConnectedAccountUpdateStatusResponse>} Updated connected account details
  *
  * @example
  * ```typescript
  * // Disable a connected account
  * const disabledAccount = await composio.connectedAccounts.disable('conn_abc123');
  * console.log(disabledAccount.isDisabled); // true
  *
  * // You can also use updateStatus with a reason
  * // const disabledAccount = await composio.connectedAccounts.updateStatus('conn_abc123', {
  * //   enabled: false,
  * //   reason: 'No longer needed'
  * // });
  * ```
  */
  async disable(nanoid) {
    return this.client.connectedAccounts.updateStatus(nanoid, { enabled: false });
  }
};
var transformToolkitListResponse = /* @__PURE__ */ __name((response) => {
  return transform(response).with(ToolKitListResponseSchema).using((response$1) => response$1.items.map((item) => ({
    name: item.name,
    slug: item.slug,
    meta: {
      ...item.meta,
      categories: item.meta.categories?.map((category) => ({
        slug: category.id,
        name: category.name
      })),
      createdAt: item.meta.created_at,
      description: item.meta.description,
      logo: item.meta.logo,
      toolsCount: item.meta.tools_count,
      triggersCount: item.meta.triggers_count,
      updatedAt: item.meta.updated_at,
      appUrl: item.meta.app_url ?? void 0
    },
    isLocalToolkit: item.is_local_toolkit,
    authSchemes: item.auth_schemes,
    composioManagedAuthSchemes: item.composio_managed_auth_schemes,
    noAuth: item.no_auth
  })));
}, "transformToolkitListResponse");
var transformToolkitRetrieveResponse = /* @__PURE__ */ __name((response) => {
  return transform(response).with(ToolkitRetrieveResponseSchema).using((response$1) => ({
    name: response$1.name,
    slug: response$1.slug,
    meta: {
      ...response$1.meta,
      createdAt: response$1.meta.created_at,
      updatedAt: response$1.meta.updated_at,
      toolsCount: response$1.meta.tools_count,
      triggersCount: response$1.meta.triggers_count,
      categories: response$1.meta.categories?.map((category) => ({
        slug: category.slug,
        name: category.name
      })),
      availableVersions: response$1.meta.available_versions
    },
    isLocalToolkit: response$1.is_local_toolkit,
    composioManagedAuthSchemes: response$1.composio_managed_auth_schemes,
    authConfigDetails: response$1.auth_config_details?.map((authConfig) => ({
      name: authConfig.name,
      mode: authConfig.mode,
      fields: {
        authConfigCreation: authConfig.fields.auth_config_creation,
        connectedAccountInitiation: authConfig.fields.connected_account_initiation
      },
      proxy: { baseUrl: authConfig.proxy?.base_url }
    })),
    baseUrl: response$1.base_url,
    getCurrentUserEndpoint: response$1.get_current_user_endpoint,
    getCurrentUserEndpointMethod: response$1.get_current_user_endpoint_method
  }));
}, "transformToolkitRetrieveResponse");
var transformToolkitRetrieveCategoriesResponse = /* @__PURE__ */ __name((response) => {
  return transform(response).with(ToolkitRetrieveCategoriesResponseSchema).using((response$1) => ({
    items: response$1.items.map((item) => ({
      id: item.id,
      name: item.name
    })),
    nextCursor: response$1.next_cursor ?? null,
    totalPages: response$1.total_pages
  }));
}, "transformToolkitRetrieveCategoriesResponse");
var Toolkits2 = class {
  static {
    __name(this, "Toolkits");
  }
  client;
  constructor(client) {
    this.client = client;
    this.authorize = this.authorize.bind(this);
    telemetry.instrument(this, "Toolkits");
  }
  /**
  * Retrieves a list of toolkits based on the provided query parameters.
  *
  * This method fetches toolkits from the Composio API and transforms the response
  * from snake_case to camelCase format for consistency with JavaScript/TypeScript conventions.
  *
  * @param {ToolkitListParams} query - The query parameters to filter toolkits
  * @returns {Promise<ToolKitListResponse>} The transformed list of toolkits
  *
  * @private
  */
  async getToolkits(query) {
    try {
      const parsedQuery = ToolkitsListParamsSchema.safeParse(query);
      if (!parsedQuery.success) throw new ValidationError("Failed to parse toolkit list query", { cause: parsedQuery.error });
      return transformToolkitListResponse(await this.client.toolkits.list({
        category: parsedQuery.data.category,
        managed_by: parsedQuery.data.managedBy,
        sort_by: parsedQuery.data.sortBy,
        cursor: parsedQuery.data.cursor,
        limit: parsedQuery.data.limit
      }));
    } catch (error) {
      throw new ComposioToolkitFetchError("Failed to fetch toolkits", { cause: error });
    }
  }
  /**
  * Retrieves a specific toolkit by its slug identifier.
  *
  * This method fetches a single toolkit from the Composio API and transforms
  * the response to use camelCase property naming consistent with JavaScript/TypeScript conventions.
  *
  * @param {string} slug - The unique slug identifier of the toolkit to retrieve
  * @returns {Promise<ToolkitRetrieveResponse>} The transformed toolkit object
  * @throws {ValidationError} If the response cannot be properly parsed
  * @throws {ComposioToolNotFoundError} If no toolkit with the given slug exists
  *
  * @private
  */
  async getToolkitBySlug(slug) {
    try {
      return transformToolkitRetrieveResponse(await this.client.toolkits.retrieve(slug));
    } catch (error) {
      if (error instanceof APIError2 && (error.status === 404 || error.status === 400)) throw new ComposioToolkitNotFoundError(`Toolkit with slug ${slug} not found`, {
        meta: { slug },
        cause: error
      });
      throw new ComposioToolkitFetchError(`Couldn't fetch Toolkit with slug: ${slug}`, {
        meta: { slug },
        cause: error
      });
    }
  }
  /**
  * Implementation method that handles both overloads for retrieving toolkits.
  *
  * @param {string | ToolkitListParams} arg - Either a toolkit slug or query parameters
  * @returns {Promise<ToolkitRetrieveResponse | ToolKitListResponse>} The toolkit or list of toolkits
  */
  async get(arg) {
    if (typeof arg === "string") return this.getToolkitBySlug(arg);
    return this.getToolkits(arg ?? {});
  }
  async getAuthConfigFields(toolkitSlug, authScheme, authConfigType, requiredOnly) {
    const toolkit = await this.getToolkitBySlug(toolkitSlug);
    if (!toolkit.authConfigDetails) throw new ComposioAuthConfigNotFoundError("No auth config found for toolkit", { meta: { toolkitSlug } });
    if (toolkit.authConfigDetails.length > 1 && !authScheme) logger_default.warn(`Multiple auth configs found for ${toolkitSlug}, please specify the auth scheme to get details of specific auth scheme. Selecting the first scheme by default.`, { meta: { toolkitSlug } });
    const authConfig = authScheme ? toolkit.authConfigDetails.find((authConfig$1) => authConfig$1.mode === authScheme) : toolkit.authConfigDetails[0];
    if (!authConfig) throw new ComposioAuthConfigNotFoundError(`Auth schema ${authScheme} not found for toolkit ${toolkitSlug} with auth scheme ${authScheme}`, { meta: {
      toolkitSlug,
      authScheme
    } });
    const requiredFields = authConfig.fields[authConfigType].required.map((field) => ({
      ...field,
      required: true
    }));
    if (requiredOnly) return requiredFields;
    const optionalFields = authConfig.fields[authConfigType].optional.map((field) => ({
      ...field,
      required: false
    }));
    return [...requiredFields, ...optionalFields];
  }
  /**
  * Retrieves the fields required for creating an auth config for a toolkit.
  * @param toolkitSlug - The slug of the toolkit to retrieve the fields for
  * @param authScheme - The auth scheme to retrieve the fields for
  * @param options.requiredOnly - Whether to only return the required fields
  * @returns {Promise<ToolkitAuthFieldsResponse>} The fields required for creating an auth config
  */
  async getAuthConfigCreationFields(toolkitSlug, authScheme, { requiredOnly = false } = {}) {
    return this.getAuthConfigFields(toolkitSlug, authScheme ?? null, "authConfigCreation", requiredOnly);
  }
  /**
  * Retrieves the fields required for initiating a connected account for a toolkit.
  * @param toolkitSlug - The slug of the toolkit to retrieve the fields for
  * @param authScheme - The auth scheme to retrieve the fields for
  * @param options.requiredOnly - Whether to only return the required fields
  * @returns {Promise<ToolkitAuthFieldsResponse>} The fields required for initiating a connected account
  */
  async getConnectedAccountInitiationFields(toolkitSlug, authScheme, { requiredOnly = false } = {}) {
    return this.getAuthConfigFields(toolkitSlug, authScheme ?? null, "connectedAccountInitiation", requiredOnly);
  }
  /**
  * Retrieves all toolkit categories available in the Composio SDK.
  *
  * This method fetches the complete list of categories from the Composio API
  * and transforms the response to use camelCase property naming.
  *
  * @returns {Promise<ToolkitRetrieveCategoriesResponse>} The list of toolkit categories
  *
  * @example
  * ```typescript
  * // Get all toolkit categories
  * const categories = await composio.toolkits.listCategories();
  * console.log(categories.items); // Array of category objects
  * ```
  */
  async listCategories() {
    return transformToolkitRetrieveCategoriesResponse(await this.client.toolkits.retrieveCategories());
  }
  /**
  * Authorizes a user to use a toolkit.
  * This method will create an auth config if one doesn't exist and initiate a connection request.
  * @param {string} userId - The user id of the user to authorize
  * @param {string} toolkitSlug - The slug of the toolkit to authorize
  * @returns {Promise<ConnectionRequest>} The connection request object
  *
  * @example
  * ```typescript
  * const connectionRequest = await composio.toolkits.authorize(userId, 'github');
  * ```
  *
  */
  async authorize(userId, toolkitSlug, authConfigId) {
    const toolkit = await this.getToolkitBySlug(toolkitSlug);
    const composioAuthConfig = new AuthConfigs2(this.client);
    let authConfigIdToUse = authConfigId;
    if (!authConfigIdToUse) authConfigIdToUse = (await composioAuthConfig.list({ toolkit: toolkitSlug })).items[0]?.id;
    if (!authConfigIdToUse) if (toolkit.authConfigDetails && toolkit.authConfigDetails.length > 0) try {
      authConfigIdToUse = (await composioAuthConfig.create(toolkitSlug, {
        type: "use_composio_managed_auth",
        name: `${toolkit.name} Auth Config`
      })).id;
    } catch (error) {
      if (error instanceof Composio.APIError && error.status === 400) throw new ComposioAuthConfigNotFoundError(`No Default auth config found for toolkit ${toolkitSlug}`, {
        meta: { toolkitSlug },
        cause: error,
        possibleFixes: [`Please Create an auth config for the toolkit ${toolkitSlug} via the dashboard`]
      });
      throw error;
    }
    else throw new ComposioAuthConfigNotFoundError(`No auth configs found for toolkit ${toolkitSlug}`, { meta: { toolkitSlug } });
    return await new ConnectedAccounts2(this.client).initiate(userId, authConfigIdToUse, { allowMultiple: true });
  }
};
var TriggerStatuses = {
  ENABLE: "enable",
  DISABLE: "disable"
};
var TriggerStatusEnum = external_exports.enum(["enable", "disable"]);
var TriggerSubscribeParamSchema = external_exports.object({
  toolkits: external_exports.array(external_exports.string()).optional(),
  triggerId: external_exports.string().optional(),
  connectedAccountId: external_exports.string().optional(),
  authConfigId: external_exports.string().optional(),
  triggerSlug: external_exports.array(external_exports.string()).optional(),
  triggerData: external_exports.string().optional(),
  userId: external_exports.string().optional()
});
var TriggerInstanceListActiveParamsSchema = external_exports.object({
  authConfigIds: external_exports.array(external_exports.string()).nullable().optional(),
  connectedAccountIds: external_exports.array(external_exports.string()).nullable().optional(),
  limit: external_exports.number().optional(),
  cursor: external_exports.string().optional(),
  showDisabled: external_exports.boolean().nullable().optional(),
  triggerIds: external_exports.array(external_exports.string()).nullable().optional(),
  triggerNames: external_exports.array(external_exports.string()).nullable().optional()
});
var TriggerInstanceListActiveResponseItemSchema = external_exports.object({
  id: external_exports.string(),
  connectedAccountId: external_exports.string(),
  disabledAt: external_exports.string().nullable(),
  state: external_exports.record(external_exports.unknown()),
  triggerConfig: external_exports.record(external_exports.unknown()),
  triggerName: external_exports.string(),
  updatedAt: external_exports.string(),
  triggerData: external_exports.string().optional(),
  uuid: external_exports.string().optional()
});
var TriggerInstanceListActiveResponseSchema = external_exports.object({
  items: external_exports.array(TriggerInstanceListActiveResponseItemSchema),
  nextCursor: external_exports.string().nullable(),
  totalPages: external_exports.number()
});
var TriggerInstanceUpsertParamsSchema = external_exports.object({
  connectedAccountId: external_exports.string().optional(),
  triggerConfig: external_exports.record(external_exports.unknown()).optional()
});
var TriggerInstanceUpsertResponseSchema = external_exports.object({ triggerId: external_exports.string() });
var TriggerInstanceManageUpdateParamsSchema = external_exports.object({ status: external_exports.enum(["enable", "disable"]) });
var TriggerInstanceManageUpdateResponseSchema = external_exports.object({ status: external_exports.enum(["success"]) });
var TriggerInstanceManageDeleteResponseSchema = external_exports.object({ triggerId: external_exports.string() });
var IncomingTriggerPayloadSchema = external_exports.object({
  id: external_exports.string().describe("The ID of the trigger"),
  uuid: external_exports.string().describe("The UUID of the trigger"),
  triggerSlug: external_exports.string().describe("The slug of the trigger that triggered the event"),
  toolkitSlug: external_exports.string().describe("The slug of the toolkit that triggered the event"),
  userId: external_exports.string().describe("The ID of the user that triggered the event"),
  payload: external_exports.record(external_exports.unknown()).describe("The payload of the trigger").optional(),
  originalPayload: external_exports.record(external_exports.unknown()).describe("The original payload of the trigger").optional(),
  metadata: external_exports.object({
    id: external_exports.string(),
    uuid: external_exports.string(),
    toolkitSlug: external_exports.string(),
    triggerSlug: external_exports.string(),
    triggerData: external_exports.string().optional(),
    triggerConfig: external_exports.record(external_exports.unknown()),
    connectedAccount: external_exports.object({
      id: external_exports.string(),
      uuid: external_exports.string(),
      authConfigId: external_exports.string(),
      authConfigUUID: external_exports.string(),
      userId: external_exports.string(),
      status: external_exports.enum(["ACTIVE", "INACTIVE"])
    })
  })
});
var TriggersTypeListParamsSchema = external_exports.object({
  cursor: external_exports.string().optional(),
  limit: external_exports.number().nullish(),
  toolkits: external_exports.array(external_exports.string()).nullish()
});
var TriggerTypeSchema = external_exports.object({
  slug: external_exports.string(),
  name: external_exports.string(),
  description: external_exports.string(),
  instructions: external_exports.string().optional(),
  toolkit: external_exports.object({
    logo: external_exports.string(),
    slug: external_exports.string(),
    name: external_exports.string()
  }),
  payload: external_exports.record(external_exports.unknown()),
  config: external_exports.record(external_exports.unknown()),
  version: external_exports.string().optional()
});
var TriggersTypeListResponseSchema = external_exports.object({
  items: external_exports.array(TriggerTypeSchema),
  nextCursor: external_exports.string().nullish(),
  totalPages: external_exports.number()
});
var WebhookPayloadV1Schema = external_exports.object({
  trigger_name: external_exports.string(),
  connection_id: external_exports.string(),
  trigger_id: external_exports.string(),
  payload: external_exports.record(external_exports.unknown()),
  log_id: external_exports.string()
});
var WebhookPayloadV2Schema = external_exports.object({
  type: external_exports.string(),
  timestamp: external_exports.string(),
  log_id: external_exports.string(),
  data: external_exports.object({
    connection_id: external_exports.string(),
    connection_nano_id: external_exports.string(),
    trigger_nano_id: external_exports.string(),
    trigger_id: external_exports.string(),
    user_id: external_exports.string()
  }).passthrough()
});
var WebhookPayloadV3Schema = external_exports.object({
  id: external_exports.string(),
  timestamp: external_exports.string(),
  type: external_exports.string().refine((val) => val.startsWith("composio."), { message: "V3 event type must start with 'composio.'" }),
  metadata: external_exports.record(external_exports.unknown()),
  data: external_exports.record(external_exports.unknown())
});
var WebhookTriggerPayloadV3Schema = external_exports.object({
  id: external_exports.string(),
  timestamp: external_exports.string(),
  type: external_exports.string(),
  metadata: external_exports.object({
    log_id: external_exports.string(),
    trigger_slug: external_exports.string(),
    trigger_id: external_exports.string(),
    connected_account_id: external_exports.string(),
    auth_config_id: external_exports.string(),
    user_id: external_exports.string()
  }).passthrough(),
  data: external_exports.record(external_exports.unknown())
});
var WebhookPayloadSchema = external_exports.union([
  WebhookPayloadV3Schema,
  WebhookPayloadV2Schema,
  WebhookPayloadV1Schema
]);
var WebhookVersions = {
  V1: "V1",
  V2: "V2",
  V3: "V3"
};
var VerifyWebhookParamsSchema = external_exports.object({
  id: external_exports.string({
    required_error: "Missing 'id' parameter. Pass the value of the 'webhook-id' HTTP header.",
    invalid_type_error: "Invalid 'id' parameter. Expected string from 'webhook-id' HTTP header."
  }),
  payload: external_exports.string({
    required_error: "Missing 'payload' parameter. Pass the raw request body as a string (do not parse it).",
    invalid_type_error: "Invalid 'payload' parameter. Expected string (raw request body)."
  }),
  secret: external_exports.string({
    required_error: "Missing 'secret' parameter. Get your webhook secret from the Composio dashboard.",
    invalid_type_error: "Invalid 'secret' parameter. Expected string."
  }),
  signature: external_exports.string({
    required_error: "Missing 'signature' parameter. Pass the value of the 'webhook-signature' HTTP header.",
    invalid_type_error: "Invalid 'signature' parameter. Expected string from 'webhook-signature' HTTP header."
  }),
  timestamp: external_exports.string({
    required_error: "Missing 'timestamp' parameter. Pass the value of the 'webhook-timestamp' HTTP header.",
    invalid_type_error: "Invalid 'timestamp' parameter. Expected string from 'webhook-timestamp' HTTP header."
  }),
  tolerance: external_exports.number().optional().default(300)
});
var SDKRealtimeCredentialsResponseSchema = external_exports.object({
  projectId: external_exports.string().describe("The project ID"),
  pusherKey: external_exports.string().describe("The Pusher key"),
  pusherCluster: external_exports.string().describe("The Pusher cluster")
});
var SDK_REALTIME_CREDENTIALS_ENDPOINT = "/api/v3/internal/sdk/realtime/credentials";
var InternalService = class {
  static {
    __name(this, "InternalService");
  }
  constructor(client) {
    this.client = client;
    this.client = client;
  }
  /**
  * Get the SDK realtime credentials
  * @returns {SDKRealtimeCredentialsResponse} The SDK realtime credentials
  */
  async getSDKRealtimeCredentials() {
    const response = await this.client.request({
      method: "get",
      path: SDK_REALTIME_CREDENTIALS_ENDPOINT
    });
    const parsedResponse = SDKRealtimeCredentialsResponseSchema.safeParse({
      pusherKey: response.pusher_key,
      projectId: response.project_id,
      pusherCluster: response.pusher_cluster
    });
    logger_default.debug(`[InternalService] SDK realtime credentials: ${JSON.stringify(parsedResponse, null, 2)}`);
    if (!parsedResponse.success) throw new ValidationError(`Failed to parse SDK realtime credentials`, { cause: parsedResponse.error });
    return parsedResponse.data;
  }
};
var PusherService = class {
  static {
    __name(this, "PusherService");
  }
  clientId;
  pusherKey;
  pusherCluster;
  pusherChannel;
  pusherBaseURL;
  apiKey;
  pusherClient;
  composioClient;
  constructor(client) {
    this.composioClient = client;
    this.pusherBaseURL = client.baseURL;
    this.apiKey = client.apiKey ?? process.env.COMPOSIO_API_KEY ?? "";
    telemetry.instrument(this, "PusherService");
  }
  /**
  * Creates a Pusher client
  *
  * This method is called when the Pusher client is first used.
  * It will fetch the SDK realtime credentials from the Apollo API and create a Pusher client.
  */
  async getPusherClient() {
    if (!this.pusherClient) {
      const internalService = new InternalService(this.composioClient);
      let sdkRealtimeCredentials;
      try {
        sdkRealtimeCredentials = await internalService.getSDKRealtimeCredentials();
      } catch (error) {
        throw new ComposioFailedToGetSDKRealtimeCredentialsError("Failed to get SDK realtime credentials", { cause: error });
      }
      this.clientId = sdkRealtimeCredentials.projectId;
      this.pusherKey = sdkRealtimeCredentials.pusherKey;
      this.pusherCluster = sdkRealtimeCredentials.pusherCluster;
      this.pusherChannel = `private-${this.clientId}_triggers`;
      logger_default.debug(`[PusherService] Creating Pusher client for client ID: ${this.clientId} in cluster ${this.pusherCluster}`);
      try {
        const { default: Pusher } = await import("./pusher-ASOFJFEX.mjs");
        this.pusherClient = new Pusher(this.pusherKey, {
          cluster: this.pusherCluster,
          channelAuthorization: {
            endpoint: `${this.pusherBaseURL}/api/v3/internal/sdk/realtime/auth`,
            headers: { "x-api-key": this.apiKey },
            transport: "ajax"
          }
        });
      } catch (error) {
        throw new ComposioFailedToCreatePusherClientError("Failed to create Pusher client", { cause: error });
      }
    }
    return this.pusherClient;
  }
  /**
  * Binds a chunked event to a Pusher client
  *
  *
  * @param channel - The Pusher client to bind the event to
  * @param event - The event to bind to
  * @param callback - The function to call when the event is received
  */
  bindWithChunking(channel, event, callback) {
    try {
      channel.bind(event, callback);
      const events = {};
      channel.bind("chunked-" + event, (data) => {
        try {
          const typedData = data;
          if (!typedData || typeof typedData.id !== "string" || typeof typedData.index !== "number") throw new Error("Invalid chunked trigger data format");
          if (!events.hasOwnProperty(typedData.id)) events[typedData.id] = {
            chunks: [],
            receivedFinal: false
          };
          const ev = events[typedData.id];
          ev.chunks[typedData.index] = typedData.chunk;
          if (typedData.final) ev.receivedFinal = true;
          if (ev.receivedFinal && ev.chunks.length === Object.keys(ev.chunks).length) try {
            callback(JSON.parse(ev.chunks.join("")));
          } catch (parseError) {
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            logger_default.error("Failed to parse chunked data:", errorMessage);
          } finally {
            delete events[typedData.id];
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger_default.error("Error processing chunked trigger data:", errorMessage);
          if (data && typeof data === "object" && "id" in data) delete events[data.id];
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger_default.error("Failed to bind chunked events:", error);
      throw new Error(`Failed to bind chunked events: ${errorMessage}`);
    }
  }
  /**
  * Subscribes to pusher to receive events from the server
  *
  * This method is used to subscribe to a Pusher channel.
  * It will create a Pusher client if it doesn't exist.
  *
  * @param channelName - The name of the Pusher channel to subscribe to
  * @param event - The event to subscribe to
  * @param fn - The function to call when the event is received
  */
  async subscribe(fn) {
    try {
      logger_default.debug(`[PusherService] Subscribing to channel: ${this.pusherChannel}`);
      const channel = await (await this.getPusherClient()).subscribe(this.pusherChannel);
      channel.bind("pusher:subscription_error", (data) => {
        const error = data.error ? String(data.error) : "Unknown subscription error";
        throw new ComposioFailedToSubscribeToPusherChannelError(`Trigger subscription error: ${error}`, { cause: error });
      });
      const safeCallback = /* @__PURE__ */ __name((data) => {
        try {
          fn(data);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger_default.error("❌ Error in trigger callback:", errorMessage);
        }
      }, "safeCallback");
      this.bindWithChunking(channel, "trigger_to_client", safeCallback);
      logger_default.info(`✅ Subscribed to triggers. You should start receiving events now.`);
    } catch (error) {
      throw new ComposioFailedToSubscribeToPusherChannelError("Failed to subscribe to Pusher channel", { cause: error });
    }
  }
  /**
  * Unsubscribes from a Pusher channel
  *
  * This method is used to unsubscribe from a Pusher channel.
  * It will create a Pusher client if it doesn't exist.
  *
  * @param channelName - The name of the Pusher channel to unsubscribe from
  */
  async unsubscribe() {
    try {
      logger_default.debug(`[PusherService] Unsubscribing from channel: ${this.pusherChannel}`);
      await (await this.getPusherClient()).unsubscribe(this.pusherChannel);
      logger_default.info(`✅ Unsubscribed from triggers.`);
    } catch (error) {
      throw new ComposioFailedToSubscribeToPusherChannelError("Failed to unsubscribe from Pusher channel", { cause: error });
    }
  }
};
function transformIncomingTriggerPayload(response) {
  return transform(response).with(IncomingTriggerPayloadSchema).using((response$1) => ({
    id: response$1.metadata.nanoId,
    uuid: response$1.metadata.id,
    triggerSlug: response$1.metadata.triggerName,
    toolkitSlug: response$1.appName,
    userId: response$1.metadata.connection?.clientUniqueUserId,
    payload: response$1.payload,
    originalPayload: response$1.originalPayload,
    metadata: {
      id: response$1.metadata.nanoId,
      uuid: response$1.metadata.id,
      triggerConfig: response$1.metadata.triggerConfig,
      triggerSlug: response$1.metadata.triggerName,
      toolkitSlug: response$1.appName,
      triggerData: response$1.metadata.triggerData,
      connectedAccount: {
        id: response$1.metadata.connection?.connectedAccountNanoId,
        uuid: response$1.metadata.connection?.id,
        authConfigId: response$1.metadata.connection?.authConfigNanoId,
        authConfigUUID: response$1.metadata.connection?.integrationId,
        userId: response$1.metadata.connection?.clientUniqueUserId,
        status: response$1.metadata.connection?.status
      }
    }
  }));
}
__name(transformIncomingTriggerPayload, "transformIncomingTriggerPayload");
function transformTriggerTypeRetrieveResponse(response) {
  return transform(response).with(TriggerTypeSchema).using((response$1) => ({
    slug: response$1.slug,
    name: response$1.name,
    description: response$1.description,
    instructions: response$1.instructions,
    toolkit: {
      logo: response$1.toolkit.logo,
      slug: response$1.toolkit.slug,
      name: response$1.toolkit.name
    },
    version: response$1.version,
    payload: response$1.payload,
    config: response$1.config
  }));
}
__name(transformTriggerTypeRetrieveResponse, "transformTriggerTypeRetrieveResponse");
function transformTriggerTypeListResponse(response) {
  return transform(response).with(TriggersTypeListResponseSchema).using((response$1) => ({
    items: response$1.items,
    nextCursor: response$1.next_cursor ?? null,
    totalPages: response$1.total_pages
  }));
}
__name(transformTriggerTypeListResponse, "transformTriggerTypeListResponse");
function transformTriggerInstanceListActiveItem(response) {
  return transform(response).with(TriggerInstanceListActiveResponseItemSchema).using((response$1) => ({
    id: response$1.id,
    connectedAccountId: response$1.connected_account_id,
    disabledAt: response$1.disabled_at,
    state: response$1.state,
    triggerConfig: response$1.trigger_config,
    triggerName: response$1.trigger_name,
    updatedAt: response$1.updated_at,
    triggerData: response$1.trigger_data,
    uuid: response$1.uuid
  }));
}
__name(transformTriggerInstanceListActiveItem, "transformTriggerInstanceListActiveItem");
function transformTriggerInstanceListActiveResponse(response) {
  return transform(response).with(TriggerInstanceListActiveResponseSchema).using((response$1) => ({
    items: response$1.items.map((item) => transformTriggerInstanceListActiveItem(item)),
    nextCursor: response$1.next_cursor ?? null,
    totalPages: response$1.total_pages
  }));
}
__name(transformTriggerInstanceListActiveResponse, "transformTriggerInstanceListActiveResponse");
async function hmacSha256Base64(secret, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await globalThis.crypto.subtle.importKey("raw", keyData, {
    name: "HMAC",
    hash: "SHA-256"
  }, false, ["sign"]);
  const signatureData = encoder.encode(message);
  return arrayBufferToBase64(await globalThis.crypto.subtle.sign("HMAC", key, signatureData));
}
__name(hmacSha256Base64, "hmacSha256Base64");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
var toStringOrDefault = /* @__PURE__ */ __name((value, defaultValue) => {
  if (value === null || value === void 0) return defaultValue;
  const str2 = String(value);
  return str2.length > 0 ? str2 : defaultValue;
}, "toStringOrDefault");
var Triggers2 = class {
  static {
    __name(this, "Triggers");
  }
  client;
  pusherService;
  toolkitVersions;
  constructor(client, config) {
    this.client = client;
    this.pusherService = new PusherService(client);
    this.toolkitVersions = config?.toolkitVersions ?? CONFIG_DEFAULTS.toolkitVersions;
    telemetry.instrument(this, "Triggers");
  }
  /**
  * Fetch list of all the active triggers
  *
  * @param {TriggerInstanceListActiveParams} query - The query parameters to filter the trigger instances
  * @returns {Promise<TriggerInstanceListActiveResponse>} List of trigger instances
  *
  * @throws {ValidationError} If the parameters are invalid
  * @throws {Error} If the client is not authenticated
  *
  * @example
  * ```ts
  * const triggers = await triggers.listActive({
  *   authConfigIds: ['123'],
  *   connectedAccountIds: ['456'],
  * });
  * ```
  */
  async listActive(query) {
    const parsedParams = TriggerInstanceListActiveParamsSchema.safeParse(query ?? {});
    if (!parsedParams.success) throw new ValidationError(`Invalid parameters passed to list triggers`, { cause: parsedParams.error });
    return transformTriggerInstanceListActiveResponse(await this.client.triggerInstances.listActive(query ? {
      auth_config_ids: parsedParams.data.authConfigIds,
      connected_account_ids: parsedParams.data.connectedAccountIds,
      cursor: parsedParams.data.cursor,
      limit: parsedParams.data.limit,
      show_disabled: parsedParams.data.showDisabled,
      trigger_ids: parsedParams.data.triggerIds,
      trigger_names: parsedParams.data.triggerNames
    } : void 0));
  }
  /**
  * Create a new trigger instance for a user
  * If the connected account id is not provided, the first connected account for the user and toolkit will be used
  *
  * @param {string} userId - The user id of the trigger instance
  * @param {string} slug - The slug of the trigger instance
  * @param {TriggerInstanceUpsertParams} body - The parameters to create the trigger instance
  * @returns {Promise<TriggerInstanceUpsertResponse>} The created trigger instance
  */
  async create(userId, slug, body) {
    const parsedBody = TriggerInstanceUpsertParamsSchema.safeParse(body ?? {});
    if (!parsedBody.success) throw new ValidationError(`Invalid parameters passed to create trigger`, { cause: parsedBody.error });
    let triggerType;
    let toolkitSlug;
    try {
      triggerType = await this.getType(slug);
      toolkitSlug = triggerType.toolkit.slug;
    } catch (error) {
      if (error instanceof APIError && (error.status === 400 || error.status === 404)) throw new ComposioTriggerTypeNotFoundError(`Trigger type ${slug} not found`, {
        cause: error,
        possibleFixes: [
          `Please check the trigger slug`,
          `Please check the provided version of toolkit has the trigger`,
          `Visit the toolkit page to see the available triggers`
        ]
      });
      else throw error;
    }
    let connectedAccountId = body?.connectedAccountId;
    try {
      const { items: connectedAccounts } = await this.client.connectedAccounts.list({
        user_ids: [userId],
        toolkit_slugs: [toolkitSlug]
      });
      if (connectedAccounts.length === 0) throw new ComposioConnectedAccountNotFoundError(`No connected account found for user ${userId} for toolkit ${toolkitSlug}`, {
        cause: /* @__PURE__ */ new Error(`No connected account found for user ${userId}`),
        possibleFixes: [`Create a new connected account for user ${userId}`]
      });
      const accountExists = connectedAccounts.some((acc) => acc.id === connectedAccountId);
      if (connectedAccountId && !accountExists) throw new ComposioConnectedAccountNotFoundError(`Connected account ID ${connectedAccountId} not found for user ${userId}`, {
        cause: /* @__PURE__ */ new Error(`Connected account ID ${connectedAccountId} not found for user ${userId}`),
        possibleFixes: [`Create a new connected account for user ${userId}`, `Verify the connected account ID`]
      });
      if (!connectedAccountId) {
        connectedAccountId = connectedAccounts[0].id;
        logger_default.warn(`[Warn] Multiple connected accounts found for user ${userId}, using the first one. Pass connectedAccountId to select a specific account.`);
      }
    } catch (error) {
      if (error instanceof APIError && [400, 404].includes(error.status)) throw new ComposioConnectedAccountNotFoundError(`No connected account found for user ${userId} for toolkit ${toolkitSlug}`, {
        cause: error,
        possibleFixes: [`Create a new connected account for user ${userId}`]
      });
      throw error;
    }
    return { triggerId: (await this.client.triggerInstances.upsert(slug, {
      connected_account_id: connectedAccountId,
      trigger_config: parsedBody.data.triggerConfig,
      toolkit_versions: this.toolkitVersions
    })).trigger_id };
  }
  /**
  * Update an existing trigger instance
  *
  * @param {string} triggerId - The Id of the trigger instance
  * @param {TriggerInstanceManageUpdateParams} body - The parameters to update the trigger instance
  * @returns {Promise<TriggerInstanceManageUpdateResponse>} The updated trigger instance response
  */
  async update(triggerId, body) {
    return this.client.triggerInstances.manage.update(triggerId, body);
  }
  /**
  * Delete a trigger instance
  *
  * @param {string} triggerId - The slug of the trigger instance
  * @returns
  */
  async delete(triggerId) {
    return { triggerId: (await this.client.triggerInstances.manage.delete(triggerId)).trigger_id };
  }
  /**
  * Disable a trigger instance
  *
  * @param {string} triggerId - The id of the trigger instance
  * @returns {Promise<TriggerInstanceUpsertResponse>} The updated trigger instance
  */
  async disable(triggerId) {
    return this.client.triggerInstances.manage.update(triggerId, { status: "disable" });
  }
  /**
  * Enable a trigger instance
  *
  * @param {string} triggerId - The id of the trigger instance
  * @returns {Promise<TriggerInstanceUpsertResponse>} The updated trigger instance
  */
  async enable(triggerId) {
    return this.client.triggerInstances.manage.update(triggerId, { status: "enable" });
  }
  /**
  * @TODO Learn about trigger types
  */
  /**
  * List all the trigger types
  *
  * @param {TriggersTypeListParams} query - The query parameters to filter the trigger types
  * @param {RequestOptions} options - Request options
  * @returns {Promise<TriggersTypeListResponse>} The list of trigger types
  */
  async listTypes(query) {
    const parsedQuery = transform(query ?? {}).with(TriggersTypeListParamsSchema).using((raw) => raw);
    return transformTriggerTypeListResponse(await this.client.triggersTypes.list({
      cursor: parsedQuery.cursor,
      limit: parsedQuery.limit,
      toolkit_slugs: parsedQuery.toolkits,
      toolkit_versions: this.toolkitVersions
    }));
  }
  /**
  * Retrieve a trigger type by its slug for the provided version of the app
  * Use the global toolkit versions param when initializing composio to pass a toolkitversion
  *
  * @param {string} slug - The slug of the trigger type
  * @returns {Promise<TriggersTypeRetrieveResponse>} The trigger type object
  */
  async getType(slug) {
    return transformTriggerTypeRetrieveResponse(await this.client.triggersTypes.retrieve(slug, { toolkit_versions: this.toolkitVersions }));
  }
  /**
  * Fetches the list of all the available trigger enums
  *
  * This method is used by the CLI where filters are not required.
  * @returns
  */
  async listEnum() {
    return this.client.triggersTypes.retrieveEnum();
  }
  /**
  * Applies compound filters to the trigger data
  * @param data data to apply filters to
  * @returns True if the trigger data matches the filters, false otherwise
  */
  shouldSendTriggerAfterFilters(filters, data) {
    if (filters.toolkits?.length && !filters.toolkits.map((toolkit) => toolkit.toLowerCase()).includes(data.toolkitSlug.toLowerCase())) {
      logger_default.debug("Trigger does not match toolkits filter", JSON.stringify(filters.toolkits, null, 2));
      return false;
    }
    if (filters.triggerId && filters.triggerId !== data.id) {
      logger_default.debug("Trigger does not match triggerId filter", JSON.stringify(filters.triggerId, null, 2));
      return false;
    }
    if (filters.connectedAccountId && filters.connectedAccountId !== data.metadata.connectedAccount.id) {
      logger_default.debug("Trigger does not match connectedAccountId filter", JSON.stringify(filters.connectedAccountId, null, 2));
      return false;
    }
    if (filters.triggerSlug?.length && !filters.triggerSlug.map((triggerSlug) => triggerSlug.toLowerCase()).includes(data.triggerSlug.toLowerCase())) {
      logger_default.debug("Trigger does not match triggerSlug filter", JSON.stringify(filters.triggerSlug, null, 2));
      return false;
    }
    if (filters.triggerData && filters.triggerData !== data.metadata.triggerData) {
      logger_default.debug("Trigger does not match triggerData filter", JSON.stringify(filters.triggerData, null, 2));
      return false;
    }
    if (filters.userId && filters.userId !== data.metadata.connectedAccount.userId) {
      logger_default.debug("Trigger does not match userId filter", JSON.stringify(filters.userId, null, 2));
      return false;
    }
    logger_default.debug("Trigger matches all filters", JSON.stringify(filters, null, 2));
    return true;
  }
  /**
  * Subscribe to all the triggers
  *
  * @param fn - The function to call when a trigger is received
  * @param filters - The filters to apply to the triggers
  *
  * @example
  * ```ts
  *
  * triggers.subscribe((data) => {
  *   console.log(data);
  * }, );
  * ```
  */
  async subscribe(fn, filters = {}) {
    if (!fn) throw new Error("Function is required for trigger subscription");
    const parsedFilters = TriggerSubscribeParamSchema.safeParse(filters);
    if (!parsedFilters.success) throw new ValidationError(`Invalid parameters passed to subscribe to triggers`, { cause: parsedFilters.error });
    logger_default.debug("🔄 Subscribing to triggers with filters: ", JSON.stringify(filters, null, 2));
    await this.pusherService.subscribe((_data) => {
      logger_default.debug("Received raw trigger data", JSON.stringify(_data, null, 2));
      const parsedData = this.parsePusherPayload(_data);
      if (this.shouldSendTriggerAfterFilters(parsedFilters.data, parsedData)) try {
        fn(parsedData);
      } catch (error) {
        logger_default.error("❌ Error in trigger callback:", error);
      }
      else logger_default.debug("Trigger does not match filters", JSON.stringify(parsedFilters.data, null, 2));
    });
  }
  /**
  * Tries to parse data as V1, V2, or V3 webhook payload format.
  * Returns the parsed result with version info, or null if no format matches.
  * Also returns any schema validation errors for debugging purposes.
  * @private
  */
  tryParseVersionedPayload(data) {
    const v3Result = WebhookPayloadV3Schema.safeParse(data);
    if (v3Result.success) return {
      ok: true,
      version: WebhookVersions.V3,
      rawPayload: v3Result.data,
      normalizedPayload: this.normalizeV3Payload(v3Result.data)
    };
    const v2Result = WebhookPayloadV2Schema.safeParse(data);
    if (v2Result.success) return {
      ok: true,
      version: WebhookVersions.V2,
      rawPayload: v2Result.data,
      normalizedPayload: this.normalizeV2Payload(v2Result.data)
    };
    const v1Result = WebhookPayloadV1Schema.safeParse(data);
    if (v1Result.success) return {
      ok: true,
      version: WebhookVersions.V1,
      rawPayload: v1Result.data,
      normalizedPayload: this.normalizeV1Payload(v1Result.data)
    };
    return {
      ok: false,
      v1Error: v1Result.error.message,
      v2Error: v2Result.error.message,
      v3Error: v3Result.error.message
    };
  }
  /**
  * Parses incoming Pusher payload, supporting V1, V2, V3, and legacy TriggerData formats.
  * @private
  */
  parsePusherPayload(data) {
    const versionedResult = this.tryParseVersionedPayload(data);
    if (versionedResult.ok) {
      logger_default.debug(`Parsed Pusher payload as ${versionedResult.version} format`);
      return versionedResult.normalizedPayload;
    }
    const legacyData = data;
    if (legacyData.metadata?.nanoId && legacyData.appName) {
      logger_default.debug("Parsed Pusher payload as legacy TriggerData format");
      return transformIncomingTriggerPayload(legacyData);
    }
    logger_default.warn("Unknown Pusher payload format. Payload keys: " + Object.keys(data).join(", "));
    const id = toStringOrDefault(data.id, toStringOrDefault(data.trigger_id, "unknown"));
    const uuid = toStringOrDefault(data.uuid, toStringOrDefault(data.id, "unknown"));
    const triggerSlug = toStringOrDefault(data.triggerSlug, toStringOrDefault(data.trigger_name, "UNKNOWN"));
    const toolkitSlug = toStringOrDefault(data.toolkitSlug, toStringOrDefault(data.appName, "UNKNOWN"));
    return {
      id,
      uuid,
      triggerSlug,
      toolkitSlug,
      userId: toStringOrDefault(data.userId, ""),
      payload: data.payload || data,
      originalPayload: data.originalPayload || data,
      metadata: {
        id,
        uuid,
        triggerSlug,
        toolkitSlug,
        triggerConfig: {},
        connectedAccount: {
          id: "",
          uuid: "",
          authConfigId: "",
          authConfigUUID: "",
          userId: "",
          status: "ACTIVE"
        }
      }
    };
  }
  /**
  * Unsubscribe from all the triggers
  *
  * @returns {Promise<void>}
  *
  * @example
  * ```ts
  * composio.trigger.subscribe((data) => {
  *   console.log(data);
  * });
  *
  * await triggers.unsubscribe();
  * ```
  */
  async unsubscribe() {
    await this.pusherService.unsubscribe();
  }
  /**
  * Verify an incoming webhook payload and signature.
  *
  * This method validates that the webhook request is authentic by:
  * 1. Verifying the HMAC-SHA256 signature matches the payload using the correct signing format
  * 2. Optionally checking that the webhook timestamp is within the tolerance window
  *
  * The signature is computed as: `HMAC-SHA256(${webhookId}.${webhookTimestamp}.${payload}, secret)`
  * and is expected in the format: `v1,base64EncodedSignature`
  *
  * @param {VerifyWebhookParams} params - The verification parameters
  * @param {string} params.payload - The raw webhook payload as a string (request body)
  * @param {string} params.signature - The signature from the 'webhook-signature' header
  * @param {string} params.secret - The webhook secret used to sign the payload
  * @param {string} params.webhookId - The webhook ID from the 'webhook-id' header
  * @param {string} params.webhookTimestamp - The timestamp from the 'webhook-timestamp' header (Unix seconds)
  * @param {number} [params.tolerance=300] - Maximum allowed age of the webhook in seconds (default: 5 minutes). Set to 0 to disable timestamp validation.
  * @returns {VerifyWebhookResult} The verified and parsed webhook payload with version information
  *
  * @throws {ValidationError} If the parameters are invalid
  * @throws {ComposioWebhookSignatureVerificationError} If the signature verification fails
  * @throws {ComposioWebhookPayloadError} If the payload cannot be parsed or is invalid
  *
  * @example
  * ```ts
  * // In an Express.js webhook handler
  * app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  *   try {
  *     const result = await composio.triggers.verifyWebhook({
  *       payload: req.body.toString(),
  *       signature: req.headers['webhook-signature'] as string,
  *       webhookId: req.headers['webhook-id'] as string,
  *       webhookTimestamp: req.headers['webhook-timestamp'] as string,
  *       secret: process.env.COMPOSIO_WEBHOOK_SECRET!,
  *     });
  *
  *     // Process the verified payload
  *     console.log('Webhook version:', result.version);
  *     console.log('Received trigger:', result.payload.triggerSlug);
  *     res.status(200).send('OK');
  *   } catch (error) {
  *     console.error('Webhook verification failed:', error);
  *     res.status(401).send('Unauthorized');
  *   }
  * });
  * ```
  */
  async verifyWebhook(params) {
    const parsedParams = VerifyWebhookParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      const missingParams = parsedParams.error.issues.filter((issue) => issue.code === "invalid_type" && issue.received === "undefined").map((issue) => {
        const paramName = issue.path[0];
        const headerName = {
          id: "webhook-id",
          timestamp: "webhook-timestamp",
          signature: "webhook-signature"
        }[paramName];
        return headerName ? `'${paramName}' (from '${headerName}' header)` : `'${paramName}'`;
      });
      if (missingParams.length > 0) throw new ValidationError(`Missing required parameters: ${missingParams.join(", ")}. Extract these values from the HTTP request headers and body.`, { cause: parsedParams.error });
      throw new ValidationError("Invalid parameters passed to verifyWebhook", { cause: parsedParams.error });
    }
    const { payload, signature, secret, id: webhookId, timestamp: webhookTimestamp, tolerance } = parsedParams.data;
    if (tolerance > 0) this.validateWebhookTimestamp(webhookTimestamp, tolerance);
    await this.verifyWebhookSignature(webhookId, webhookTimestamp, payload, signature, secret);
    const { version: version$1, rawPayload, normalizedPayload } = this.parseWebhookPayload(payload);
    return {
      version: version$1,
      payload: normalizedPayload,
      rawPayload
    };
  }
  /**
  * Parses the webhook payload and detects its version (V1, V2, or V3)
  * @private
  */
  parseWebhookPayload(payload) {
    let jsonPayload;
    try {
      jsonPayload = JSON.parse(payload);
    } catch (error) {
      throw new ComposioWebhookPayloadError("Failed to parse webhook payload as JSON", { cause: error });
    }
    const result = this.tryParseVersionedPayload(jsonPayload);
    if (result.ok) {
      const { ok, ...rest } = result;
      return rest;
    }
    const { v1Error, v2Error, v3Error } = result;
    throw new ComposioWebhookPayloadError("Webhook payload does not match any known version (V1, V2, or V3). Please ensure you are using a supported webhook payload format.", { cause: {
      v1Error,
      v2Error,
      v3Error
    } });
  }
  /**
  * Normalizes a V1 webhook payload to IncomingTriggerPayload format
  * @private
  */
  normalizeV1Payload(payload) {
    const triggerName = payload.trigger_name;
    const toolkitSlug = triggerName.split("_")[0]?.toUpperCase() || "UNKNOWN";
    return {
      id: payload.trigger_id,
      uuid: payload.trigger_id,
      triggerSlug: triggerName,
      toolkitSlug,
      userId: "",
      payload: payload.payload,
      originalPayload: payload.payload,
      metadata: {
        id: payload.trigger_id,
        uuid: payload.trigger_id,
        toolkitSlug,
        triggerSlug: triggerName,
        triggerConfig: {},
        connectedAccount: {
          id: payload.connection_id,
          uuid: payload.connection_id,
          authConfigId: "",
          authConfigUUID: "",
          userId: "",
          status: "ACTIVE"
        }
      }
    };
  }
  /**
  * Normalizes a V2 webhook payload to IncomingTriggerPayload format
  * @private
  */
  normalizeV2Payload(payload) {
    const triggerSlug = payload.type.toUpperCase();
    const toolkitSlug = triggerSlug.split("_")[0] || "UNKNOWN";
    const { connection_id, connection_nano_id, trigger_nano_id, trigger_id, user_id, ...restData } = payload.data;
    return {
      id: trigger_nano_id,
      uuid: trigger_id,
      triggerSlug,
      toolkitSlug,
      userId: user_id,
      payload: restData,
      originalPayload: restData,
      metadata: {
        id: trigger_nano_id,
        uuid: trigger_id,
        toolkitSlug,
        triggerSlug,
        triggerConfig: {},
        connectedAccount: {
          id: connection_nano_id,
          uuid: connection_id,
          authConfigId: "",
          authConfigUUID: "",
          userId: user_id,
          status: "ACTIVE"
        }
      }
    };
  }
  /**
  * Normalizes a V3 webhook payload to IncomingTriggerPayload format
  * @private
  */
  normalizeV3Payload(payload) {
    const triggerResult = WebhookTriggerPayloadV3Schema.safeParse(payload);
    if (triggerResult.success) {
      const triggerSlug = triggerResult.data.metadata.trigger_slug;
      const toolkitSlug = triggerSlug.split("_")[0]?.toUpperCase() || "UNKNOWN";
      return {
        id: triggerResult.data.metadata.trigger_id,
        uuid: triggerResult.data.metadata.trigger_id,
        triggerSlug,
        toolkitSlug,
        userId: triggerResult.data.metadata.user_id,
        payload: payload.data,
        originalPayload: payload.data,
        metadata: {
          id: triggerResult.data.metadata.trigger_id,
          uuid: triggerResult.data.metadata.trigger_id,
          toolkitSlug,
          triggerSlug,
          triggerConfig: {},
          connectedAccount: {
            id: triggerResult.data.metadata.connected_account_id,
            uuid: triggerResult.data.metadata.connected_account_id,
            authConfigId: triggerResult.data.metadata.auth_config_id,
            authConfigUUID: triggerResult.data.metadata.auth_config_id,
            userId: triggerResult.data.metadata.user_id,
            status: "ACTIVE"
          }
        }
      };
    }
    return {
      id: payload.id,
      uuid: payload.id,
      triggerSlug: payload.type,
      toolkitSlug: "COMPOSIO",
      userId: "",
      payload: payload.data,
      originalPayload: payload,
      metadata: {
        id: payload.id,
        uuid: payload.id,
        toolkitSlug: "COMPOSIO",
        triggerSlug: payload.type,
        triggerConfig: {},
        connectedAccount: {
          id: "",
          uuid: "",
          authConfigId: "",
          authConfigUUID: "",
          userId: "",
          status: "ACTIVE"
        }
      }
    };
  }
  /**
  * Verifies the HMAC-SHA256 signature of a webhook payload.
  * The signature format used by Composio is: `v1,base64EncodedSignature`
  * The signing input is: `${msgId}.${timestamp}.${payload}`
  * @private
  */
  async verifyWebhookSignature(webhookId, webhookTimestamp, payload, signature, secret) {
    if (payload.length === 0) throw new ComposioWebhookSignatureVerificationError("No webhook payload was provided.");
    if (signature.length === 0) throw new ComposioWebhookSignatureVerificationError("No signature header value was provided. Please pass the value of the 'webhook-signature' header.");
    if (secret.length === 0) throw new ComposioWebhookSignatureVerificationError("No webhook secret was provided. You can find your webhook secret in your Composio dashboard.");
    if (webhookId.length === 0) throw new ComposioWebhookSignatureVerificationError("No webhook ID was provided. Please pass the value of the 'webhook-id' header.");
    if (webhookTimestamp.length === 0) throw new ComposioWebhookSignatureVerificationError("No webhook timestamp was provided. Please pass the value of the 'webhook-timestamp' header.");
    const signatures = signature.split(" ");
    const v1Signatures = [];
    for (const sig of signatures) {
      const [version$1, value] = sig.split(",");
      if (version$1 === "v1" && value) v1Signatures.push(value);
    }
    if (v1Signatures.length === 0) throw new ComposioWebhookSignatureVerificationError("No valid v1 signature found in the webhook-signature header. Expected format: 'v1,base64EncodedSignature'");
    const expectedSignature = await hmacSha256Base64(secret, `${webhookId}.${webhookTimestamp}.${payload}`);
    let isValid = false;
    for (const providedSignature of v1Signatures) if (timingSafeEqual(providedSignature, expectedSignature)) {
      isValid = true;
      break;
    }
    if (!isValid) throw new ComposioWebhookSignatureVerificationError("The signature provided is invalid. Please ensure you are using the correct webhook secret.");
  }
  /**
  * Validates that the webhook timestamp is within the allowed tolerance
  * @private
  */
  validateWebhookTimestamp(webhookTimestamp, tolerance) {
    const timestampSeconds = parseInt(webhookTimestamp, 10);
    if (Number.isNaN(timestampSeconds)) throw new ComposioWebhookPayloadError(`Invalid webhook timestamp: ${webhookTimestamp}. Expected Unix timestamp in seconds.`);
    const webhookTimeMs = timestampSeconds * 1e3;
    const currentTime = Date.now();
    const timeDifference = Math.abs(currentTime - webhookTimeMs);
    if (timeDifference > tolerance * 1e3) throw new ComposioWebhookSignatureVerificationError(`The webhook timestamp is outside the allowed tolerance. The webhook was sent ${Math.round(timeDifference / 1e3)} seconds ago, but the maximum allowed age is ${tolerance} seconds.`);
  }
};
var MCPServerInstanceSchema = v3_default.object({
  id: v3_default.string(),
  name: v3_default.string(),
  type: v3_default.literal("streamable_http"),
  url: v3_default.string(),
  userId: v3_default.string(),
  allowedTools: v3_default.array(v3_default.string()),
  authConfigs: v3_default.array(v3_default.string())
});
var MCPConfigToolkitsSchema = v3_default.object({
  toolkit: v3_default.string().describe("Id of the toolkit").optional(),
  authConfigId: v3_default.string().describe("Id of the auth config").optional()
});
var MCPConfigCreationParamsSchema = v3_default.object({
  toolkits: v3_default.array(v3_default.union([MCPConfigToolkitsSchema, v3_default.string()])),
  allowedTools: v3_default.array(v3_default.string()).optional(),
  manuallyManageConnections: v3_default.boolean().default(false).optional().describe(`Whether to manually manage accounts. If true, you need to manage accounts manually connect user accounts. 
If set to false, composio will inject account maangement tools into your mcp server for agents to request and authenticate accounts.
defaults to false`)
});
var MCPConfigResponseSchema = v3_default.object({
  id: v3_default.string(),
  name: v3_default.string(),
  allowedTools: v3_default.array(v3_default.string()),
  authConfigIds: v3_default.array(v3_default.string()),
  commands: v3_default.object({
    claude: v3_default.string(),
    cursor: v3_default.string(),
    windsurf: v3_default.string()
  }),
  MCPUrl: v3_default.string()
});
var MCPGetInstanceParamsSchema = v3_default.object({ manuallyManageConnections: v3_default.boolean().default(false).optional().describe(`Whether to manually manage accounts. If true, you need to manage accounts manually connect user accounts. 
If set to false, composio will inject account maangement tools into your mcp server for agents to request and authenticate accounts.
defaults to false`) });
var MCPListParamsSchema = v3_default.object({
  page: v3_default.number().optional().default(1),
  limit: v3_default.number().optional().default(10),
  toolkits: v3_default.array(v3_default.string()).optional().default([]),
  authConfigs: v3_default.array(v3_default.string()).optional().default([]),
  name: v3_default.string().optional()
});
var MCPItemSchema = MCPConfigResponseSchema.extend({ ...v3_default.object({
  toolkitIcons: v3_default.record(v3_default.string(), v3_default.string()),
  serverInstanceCount: v3_default.number(),
  toolkits: v3_default.array(v3_default.string())
}).shape });
var MCPListResponseSchema = v3_default.object({
  items: v3_default.array(MCPItemSchema),
  currentPage: v3_default.number(),
  totalPages: v3_default.number()
});
var MCPUpdateParamsSchema = v3_default.object({
  name: v3_default.string().optional(),
  toolkits: v3_default.array(v3_default.union([MCPConfigToolkitsSchema, v3_default.string()])).optional(),
  allowedTools: v3_default.array(v3_default.string()).optional(),
  manuallyManageConnections: v3_default.boolean().optional().describe(`Whether to manually manage accounts. If true, you need to manage accounts manually connect user accounts. 
If set to false, composio will inject account maangement tools into your mcp server for agents to request and authenticate accounts.
defaults to false`)
});
var MCPServerConnectionStatus = v3_default.object({
  connected: v3_default.boolean(),
  toolkit: v3_default.string(),
  connectedAccountId: v3_default.string()
});
var MCPServerConnectedAccountsSchema = v3_default.record(v3_default.string(), v3_default.array(v3_default.object({
  toolkit: v3_default.string(),
  authConfigId: v3_default.string(),
  connectedAccountId: v3_default.string()
})));
function transformMCPItemResponse(response) {
  return transform(response).with(MCPItemSchema).using((raw) => ({
    name: raw.name,
    allowedTools: raw.allowed_tools,
    id: raw.id,
    authConfigIds: raw.auth_config_ids,
    commands: raw.commands,
    MCPUrl: raw.mcp_url,
    toolkitIcons: raw.toolkit_icons,
    serverInstanceCount: raw.server_instance_count,
    toolkits: raw.toolkits
  }));
}
__name(transformMCPItemResponse, "transformMCPItemResponse");
var MCP = class {
  static {
    __name(this, "MCP");
  }
  client;
  constructor(client) {
    this.client = client;
    telemetry.instrument(this, "MCP");
  }
  /**
  * Create a new MCP configuration.
  * @param {Object} params - Parameters for creating the MCP configuration
  * @param {Array} params.authConfig - Array of auth configurations with id and allowed tools
  * @param {Object} params.options - Configuration options
  * @param {string} params.options.name - Unique name for the MCP configuration
  * @param {boolean} [params.options.manuallyManageConnections] - Whether to use chat-based authentication or manually connect accounts
  * @returns {Promise<McpServerCreateResponse<T>>} Created server details with instance getter
  *
  * @example
  * ```typescript
  * const server = await composio.mcpConfig.create("personal-mcp-server", {
  *   toolkits: ["github", "slack"],
  *   allowedTools: ["GMAIL_FETCH_EMAILS", "SLACK_SEND_MESSAGE"],
  *   manuallyManageConnections: false
  *  }
  * });
  *
  * const server = await composio.mcpConfig.create("personal-mcp-server", {
  *   toolkits: [{ toolkit: "gmail", authConfigId: "ac_243434343" }],
  *   allowedTools: ["GMAIL_FETCH_EMAILS"],
  *   manuallyManageConnections: false
  *  }
  * });
  * ```
  */
  async create(name, mcpConfig) {
    const config = MCPConfigCreationParamsSchema.safeParse(mcpConfig);
    if (config.error) throw new ValidationError("Invalid parameters passed to create mcp config", { cause: config.error });
    const toolkits = [];
    const auth_config_ids = [];
    const custom_tools = config.data.allowedTools ?? [];
    config.data.toolkits.forEach((toolkit) => {
      if (typeof toolkit === "string") toolkits.push(toolkit);
      else if (toolkit.toolkit) toolkits.push(toolkit.toolkit);
      else if (toolkit.authConfigId) auth_config_ids.push(toolkit.authConfigId);
    });
    const server = await this.client.mcp.custom.create({
      name,
      toolkits,
      auth_config_ids,
      custom_tools,
      managed_auth_via_composio: config.data.manuallyManageConnections ? false : true
    });
    return {
      ...transform(server).with(MCPConfigResponseSchema).using((raw) => ({
        name: raw.name,
        allowedTools: raw.allowed_tools,
        id: raw.id,
        authConfigIds: raw.auth_config_ids,
        commands: raw.commands,
        MCPUrl: raw.mcp_url
      })),
      generate: /* @__PURE__ */ __name(async (userId) => {
        return await this.generate(userId, server.id, { manuallyManageConnections: config.data.manuallyManageConnections });
      }, "generate")
    };
  }
  /**
  * List the MCP servers with optional filtering and pagination
  * @param {Object} options - Filtering and pagination options
  * @param {number} [options.page=1] - Page number for pagination (1-based)
  * @param {number} [options.limit=10] - Maximum number of items to return per page
  * @param {string[]} [options.toolkits=[]] - Array of toolkit names to filter by
  * @param {string[]} [options.authConfigs=[]] - Array of auth configuration IDs to filter by
  * @param {string} [options.name] - Filter by MCP server name (partial match)
  * @returns {Promise<MCPListResponse>} Paginated list of MCP servers with metadata
  *
  * @example
  * ```typescript
  * // List all MCP servers
  * const allServers = await composio.experimental.mcp.list({});
  *
  * // List with pagination
  * const pagedServers = await composio.experimental.mcp.list({
  *   page: 2,
  *   limit: 5
  * });
  *
  * // Filter by toolkit
  * const githubServers = await composio.experimental.mcp.list({
  *   toolkits: ['github', 'slack']
  * });
  *
  * // Filter by name
  * const namedServers = await composio.experimental.mcp.list({
  *   name: 'personal'
  * });
  * ```
  */
  async list(options) {
    const { data: params, error } = MCPListParamsSchema.safeParse(options);
    if (error) throw new ValidationError("Failed to validate list options", { cause: error });
    return transform(await this.client.mcp.list({
      page_no: params.page,
      limit: params.limit,
      toolkits: params.toolkits?.length > 0 ? params.toolkits.join(",") : void 0,
      auth_config_ids: params.authConfigs?.length > 0 ? params.authConfigs.join(",") : void 0,
      name: params.name
    })).with(MCPListResponseSchema).using((raw) => ({
      currentPage: raw.current_page,
      totalPages: raw.total_pages,
      items: raw.items.map((item) => ({
        name: item.name,
        allowedTools: item.allowed_tools,
        id: item.id,
        authConfigIds: item.auth_config_ids,
        commands: item.commands,
        MCPUrl: item.mcp_url,
        toolkitIcons: item.toolkit_icons,
        serverInstanceCount: item.server_instance_count,
        toolkits: item.toolkits
      }))
    }));
  }
  /**
  * Retrieve detailed information about a specific MCP server by its ID
  * @param {string} serverId - The unique identifier of the MCP server to retrieve
  * @returns {Promise<MCPItem>} Complete MCP server details including configuration, tools, and metadata
  *
  * @example
  * ```typescript
  * // Get a specific MCP server by ID
  * const server = await composio.experimental.mcp.get("mcp_12345");
  *
  * console.log(server.name); // "My Personal MCP Server"
  * console.log(server.allowedTools); // ["GITHUB_CREATE_ISSUE", "SLACK_SEND_MESSAGE"]
  * console.log(server.toolkits); // ["github", "slack"]
  * console.log(server.serverInstanceCount); // 3
  *
  * // Access setup commands for different clients
  * console.log(server.commands.claude); // Claude setup command
  * console.log(server.commands.cursor); // Cursor setup command
  * console.log(server.commands.windsurf); // Windsurf setup command
  *
  * // Use the MCP URL for direct connections
  * const mcpUrl = server.MCPUrl;
  * ```
  *
  * @throws {ValidationError} When the server ID is invalid or server not found
  */
  async get(serverId) {
    return transformMCPItemResponse(await this.client.mcp.retrieve(serverId));
  }
  /**
  * Delete an MCP server configuration permanently
  * @param {string} serverId - The unique identifier of the MCP server to delete
  * @returns {Promise<{id: string; deleted: boolean}>} Confirmation object with server ID and deletion status
  *
  * @example
  * ```typescript
  * // Delete an MCP server by ID
  * const result = await composio.experimental.mcp.delete("mcp_12345");
  *
  * if (result.deleted) {
  *   console.log(`Server ${result.id} has been successfully deleted`);
  * } else {
  *   console.log(`Failed to delete server ${result.id}`);
  * }
  *
  * // Example with error handling
  * try {
  *   const result = await composio.experimental.mcp.delete("mcp_12345");
  *   console.log("Deletion successful:", result);
  * } catch (error) {
  *   console.error("Failed to delete MCP server:", error.message);
  * }
  *
  * // Delete and verify from list
  * await composio.experimental.mcp.delete("mcp_12345");
  * const servers = await composio.experimental.mcp.list({});
  * const serverExists = servers.items.some(server => server.id === "mcp_12345");
  * console.log("Server still exists:", serverExists); // Should be false
  * ```
  *
  * @throws {ValidationError} When the server ID is invalid or server not found
  * @throws {Error} When the server cannot be deleted due to active connections or other constraints
  *
  * @warning This operation is irreversible. Once deleted, the MCP server configuration and all its associated data will be permanently removed.
  */
  async delete(serverId) {
    return await this.client.mcp.delete(serverId);
  }
  /**
  * Update an existing MCP server configuration with new settings
  * @param {string} serverId - The unique identifier of the MCP server to update
  * @param {Object} config - Update configuration parameters
  * @param {string} [config.name] - New name for the MCP server
  * @param {Array} [config.toolkits] - Updated toolkit configurations
  * @param {string} [config.toolkits[].toolkit] - Toolkit identifier (e.g., "github", "slack")
  * @param {string} [config.toolkits[].authConfigId] - Auth configuration ID for the toolkit
  * @param {string[]} [config.toolkits[].allowedTools] - Specific tools to enable for this toolkit
  * @param {boolean} [config.manuallyManageConnections] - Whether to manually manage account connections
  * @returns {Promise<MCPItem>} Updated MCP server configuration with all details
  *
  * @example
  * ```typescript
  * // Update server name only
  * const updatedServer = await composio.experimental.mcp.update("mcp_12345", {
  *   name: "My Updated MCP Server"
  * });
  *
  * // Update toolkits and tools
  * const serverWithNewTools = await composio.experimental.mcp.update("mcp_12345", {
  *   toolkits: [
  *     {
  *       toolkit: "github",
  *       authConfigId: "auth_abc123",
  *       allowedTools: ["GITHUB_CREATE_ISSUE", "GITHUB_LIST_REPOS"]
  *     },
  *     {
  *       toolkit: "slack",
  *       authConfigId: "auth_xyz789",
  *       allowedTools: ["SLACK_SEND_MESSAGE", "SLACK_LIST_CHANNELS"]
  *     }
  *   ]
  * });
  *
  * // Update connection management setting
  * const serverWithManualAuth = await composio.experimental.mcp.update("mcp_12345", {
  *   name: "Manual Auth Server",
  *   manuallyManageConnections: true
  * });
  *
  * // Complete update example
  * const fullyUpdatedServer = await composio.experimental.mcp.update("mcp_12345", {
  *   name: "Production MCP Server",
  *   toolkits: [
  *     {
  *       toolkit: "gmail",
  *       authConfigId: "auth_gmail_prod",
  *     }
  *   ],
  *   allowedTools: ["GMAIL_SEND_EMAIL", "GMAIL_FETCH_EMAILS"]
  *   manuallyManageConnections: false
  * });
  *
  * console.log("Updated server:", fullyUpdatedServer.name);
  * console.log("New tools:", fullyUpdatedServer.allowedTools);
  * ```
  *
  * @throws {ValidationError} When the update parameters are invalid or malformed
  * @throws {Error} When the server ID doesn't exist or update fails
  *
  * @note Only provided fields will be updated. Omitted fields will retain their current values.
  * @note When updating toolkits, the entire toolkit configuration is replaced, not merged.
  */
  async update(serverId, config) {
    const { data: params, error } = MCPUpdateParamsSchema.safeParse(config);
    if (error) throw new ValidationError("Failed to validate update params", { cause: error });
    const toolkits = [];
    const auth_config_ids = [];
    const custom_tools = params.allowedTools ?? void 0;
    params.toolkits?.forEach((toolkit) => {
      if (typeof toolkit === "string") toolkits.push(toolkit);
      else if (toolkit.toolkit) toolkits.push(toolkit.toolkit);
      else if (toolkit.authConfigId) auth_config_ids.push(toolkit.authConfigId);
    });
    return transformMCPItemResponse(await this.client.mcp.update(serverId, {
      name: params.name ?? void 0,
      ...params.toolkits ? {
        custom_tools,
        toolkits,
        auth_config_ids
      } : {},
      managed_auth_via_composio: params.manuallyManageConnections ?? void 0
    }));
  }
  /**
  * Get server URLs for an existing MCP server.
  * The response is wrapped according to the provider's specifications.
  *
  * @example
  * ```typescript
  * import { Composio } from "@composio/code";
  *
  * const composio = new Composio();
  * const mcp = await composio.experimental.mcp.generate("default", "<mcp_config_id>");
  * ```
  *
  * @param userId {string} external user id from your database for whom you want the server for
  * @param mcpConfigId {string} config id of the MCPConfig for which you want to create a server for
  * @param options {object} additional options
  * @param options.isChatAuth {boolean} Authenticate the users via chat when they use the MCP Server
  */
  async generate(userId, mcpConfigId, options) {
    const server = await this.client.mcp.retrieve(mcpConfigId);
    const params = MCPGetInstanceParamsSchema.safeParse(options ?? { manuallyManageConnections: false });
    if (params.error) throw new ValidationError("Invalid params passed for Get Instance Params", { cause: params.error });
    const userIdsURL = (await this.client.mcp.generate.url({
      mcp_server_id: mcpConfigId,
      user_ids: [userId],
      managed_auth_by_composio: options?.manuallyManageConnections ? false : true
    })).user_ids_url[0];
    const serverInstance = MCPServerInstanceSchema.safeParse({
      id: server.id,
      name: server.name,
      type: "streamable_http",
      url: userIdsURL,
      userId,
      allowedTools: server.allowed_tools,
      authConfigs: server.auth_config_ids
    });
    if (serverInstance.error) throw new ValidationError("Failed to parse MCP server instance", { cause: serverInstance.error });
    return serverInstance.data;
  }
};
var userDataPath = /* @__PURE__ */ __name(() => {
  try {
    const homeDir = platform.homedir();
    if (!homeDir) return null;
    return platform.joinPath(homeDir, COMPOSIO_DIR, USER_DATA_FILE_NAME);
  } catch (_error) {
    logger_default.debug("Environment", `Unable to get user data path`);
    return null;
  }
}, "userDataPath");
var getUserDataJson = /* @__PURE__ */ __name(() => {
  try {
    const dataPath = userDataPath();
    if (!dataPath || !platform.supportsFileSystem) return {};
    const data = platform.readFileSync(dataPath, "utf8");
    return JSON.parse(data);
  } catch (_error) {
    logger_default.debug("Environment", "No user data file found");
    return {};
  }
}, "getUserDataJson");
function getSDKConfig(baseUrl, apiKey) {
  const { api_key: apiKeyFromUserConfig, base_url: baseURLFromUserConfig } = getUserDataJson();
  const baseURLParsed = baseUrl || getEnvVariable("COMPOSIO_BASE_URL") || baseURLFromUserConfig || DEFAULT_BASE_URL;
  const apiKeyParsed = apiKey || getEnvVariable("COMPOSIO_API_KEY") || apiKeyFromUserConfig || "";
  if (!apiKeyParsed) ComposioError$1.handleAndThrow(new ComposioNoAPIKeyError());
  logger_default.debug("Environment", `API Key: ${apiKeyParsed}`);
  logger_default.debug("Environment", `Base URL: ${baseURLParsed}`);
  return {
    baseURL: baseURLParsed,
    apiKey: apiKeyParsed
  };
}
__name(getSDKConfig, "getSDKConfig");
function getToolkitVersionsFromEnv(defaultVersions) {
  if (defaultVersions && typeof defaultVersions === "string") return defaultVersions;
  const envPrefixedVersions = getEnvsWithPrefix(`COMPOSIO_TOOLKIT_VERSION_`);
  const toolkitVersionsFromEnv = Object.entries(envPrefixedVersions).reduce((acc, [key, value]) => {
    const toolkitName = key.replace("COMPOSIO_TOOLKIT_VERSION_", "");
    acc[toolkitName.toLowerCase()] = value;
    return acc;
  }, {});
  let userProvidedToolkitVersions = {};
  if (defaultVersions && typeof defaultVersions === "object") userProvidedToolkitVersions = Object.fromEntries(Object.entries(defaultVersions).map(([key, value]) => [key.toLowerCase(), value]));
  const toolkitVersions = {
    ...toolkitVersionsFromEnv,
    ...userProvidedToolkitVersions
  };
  if (Object.keys(toolkitVersions).length === 0) return "latest";
  return toolkitVersions;
}
__name(getToolkitVersionsFromEnv, "getToolkitVersionsFromEnv");
async function checkForLatestVersionFromNPM(currentVersion) {
  try {
    const packageName = "@composio/core";
    const currentVersionFromPackageJson = currentVersion;
    if (!import_semver.default.valid(currentVersionFromPackageJson)) return;
    const prerelease = import_semver.default.prerelease(currentVersionFromPackageJson);
    if (prerelease && (String(prerelease[0]).includes("alpha") || String(prerelease[0]).includes("beta"))) return;
    const latestVersion = (await (await fetch(`https://registry.npmjs.org/${packageName}/latest`)).json()).version;
    if (import_semver.default.gt(latestVersion, currentVersionFromPackageJson) && !IS_DEVELOPMENT_OR_CI) logger_default.info(`🚀 Upgrade available! Your composio-core version (${currentVersionFromPackageJson}) is behind. Latest version: ${latestVersion}.`);
  } catch (_error) {
  }
}
__name(checkForLatestVersionFromNPM, "checkForLatestVersionFromNPM");
var BaseProvider = class {
  static {
    __name(this, "BaseProvider");
  }
  /**
  * @internal
  * The function to execute a tool.
  * This is set automatically injected by the core SDK.
  */
  _globalExecuteToolFn;
  /**
  * @internal
  * Set the function to execute a tool.
  * This is set automatically and injected by the core SDK.
  */
  _setExecuteToolFn(executeToolFn) {
    this._globalExecuteToolFn = executeToolFn;
  }
  /**
  * @public
  * Global function to execute a tool.
  * This function is used by providers to implement helper functions to execute tools.
  * This is a 1:1 mapping of the `execute` method in the `Tools` class.
  * @param {string} toolSlug - The slug of the tool to execute.
  * @param {ToolExecuteParams} body - The body of the tool execution.
  * @param {ExecuteToolModifiers} modifers - The modifiers of the tool execution.
  * @returns {Promise<string>} The result of the tool execution.
  */
  executeTool(toolSlug, body, modifers) {
    if (!this._globalExecuteToolFn) throw new ComposioGlobalExecuteToolFnNotSetError("executeToolFn is not set");
    return this._globalExecuteToolFn(toolSlug, body, modifers);
  }
};
var BaseNonAgenticProvider = class extends BaseProvider {
  static {
    __name(this, "BaseNonAgenticProvider");
  }
  _isAgentic = false;
};
var BaseAgenticProvider = class extends BaseProvider {
  static {
    __name(this, "BaseAgenticProvider");
  }
  _isAgentic = true;
};
var OpenAIProvider = class extends BaseNonAgenticProvider {
  static {
    __name(this, "OpenAIProvider");
  }
  name = "openai";
  /**
  * Creates a new instance of the OpenAIProvider.
  *
  * This is the default provider for the Composio SDK and is automatically
  * available without additional installation.
  *
  * @example
  * ```typescript
  * // The OpenAIProvider is used by default when initializing Composio
  * const composio = new Composio({
  *   apiKey: 'your-api-key'
  * });
  *
  * // You can also explicitly specify it
  * const composio = new Composio({
  *   apiKey: 'your-api-key',
  *   provider: new OpenAIProvider()
  * });
  * ```
  */
  constructor() {
    super();
  }
  /**
  * Transform MCP URL response into OpenAI-specific format.
  * OpenAI uses the standard format by default.
  *
  * @param data - The MCP URL response data
  * @returns Standard MCP server response format
  */
  wrapMcpServerResponse(data) {
    return data.map((item) => ({
      url: new URL(item.url),
      name: item.name
    }));
  }
  /**
  * Wraps a Composio tool in the OpenAI function calling format.
  *
  * This method transforms a Composio tool definition into the format
  * expected by OpenAI's function calling API.
  *
  * @param tool - The Composio tool to wrap
  * @returns The wrapped tool in OpenAI format
  *
  * @example
  * ```typescript
  * // Wrap a single tool for use with OpenAI
  * const composioTool = {
  *   slug: 'SEARCH_TOOL',
  *   description: 'Search for information',
  *   inputParameters: {
  *     type: 'object',
  *     properties: {
  *       query: { type: 'string' }
  *     },
  *     required: ['query']
  *   }
  * };
  *
  * const openAITool = provider.wrapTool(composioTool);
  * ```
  */
  wrapTool = /* @__PURE__ */ __name((tool) => {
    return {
      type: "function",
      function: {
        name: tool.slug,
        description: tool.description,
        parameters: tool.inputParameters
      }
    };
  }, "wrapTool");
  /**
  * Wraps multiple Composio tools in the OpenAI function calling format.
  *
  * This method transforms a list of Composio tools into the format
  * expected by OpenAI's function calling API.
  *
  * @param tools - Array of Composio tools to wrap
  * @returns Array of wrapped tools in OpenAI format
  *
  * @example
  * ```typescript
  * // Wrap multiple tools for use with OpenAI
  * const composioTools = [
  *   {
  *     slug: 'SEARCH_TOOL',
  *     description: 'Search for information',
  *     inputParameters: {
  *       type: 'object',
  *       properties: {
  *         query: { type: 'string' }
  *       }
  *     }
  *   },
  *   {
  *     slug: 'WEATHER_TOOL',
  *     description: 'Get weather information',
  *     inputParameters: {
  *       type: 'object',
  *       properties: {
  *         location: { type: 'string' }
  *       }
  *     }
  *   }
  * ];
  *
  * const openAITools = provider.wrapTools(composioTools);
  * ```
  */
  wrapTools = /* @__PURE__ */ __name((tools) => {
    return tools.map((tool) => this.wrapTool(tool));
  }, "wrapTools");
  /**
  * Executes a tool call from OpenAI's chat completion.
  *
  * This method processes a tool call from OpenAI's chat completion API,
  * executes the corresponding Composio tool, and returns the result.
  *
  * @param {string} userId - The user ID for authentication and tracking
  * @param {OpenAI.ChatCompletionMessageToolCall} tool - The tool call from OpenAI
  * @param {ExecuteToolFnOptions} [options] - Optional execution options
  * @param {ExecuteToolModifiers} [modifiers] - Optional execution modifiers
  * @returns {Promise<string>} The result of the tool call as a JSON string
  *
  * @example
  * ```typescript
  * // Execute a tool call from OpenAI
  * const toolCall = {
  *   id: 'call_abc123',
  *   type: 'function',
  *   function: {
  *     name: 'SEARCH_TOOL',
  *     arguments: '{"query":"composio documentation"}'
  *   }
  * };
  *
  * const result = await provider.executeToolCall(
  *   'user123',
  *   toolCall,
  *   { connectedAccountId: 'conn_xyz456' }
  * );
  * console.log(JSON.parse(result));
  * ```
  */
  async executeToolCall(userId, tool, options, modifiers) {
    const payload = {
      arguments: JSON.parse(tool.function.arguments),
      connectedAccountId: options?.connectedAccountId,
      customAuthParams: options?.customAuthParams,
      customConnectionData: options?.customConnectionData,
      userId
    };
    const result = await this.executeTool(tool.function.name, payload, modifiers);
    return JSON.stringify(result);
  }
  /**
  * Handles tool calls from OpenAI's chat completion response.
  *
  * This method processes tool calls from an OpenAI chat completion response,
  * executes each tool call, and returns the results.
  *
  * @param {string} userId - The user ID for authentication and tracking
  * @param {OpenAI.ChatCompletion} chatCompletion - The chat completion response from OpenAI
  * @param {ExecuteToolFnOptions} [options] - Optional execution options
  * @param {ExecuteToolModifiers} [modifiers] - Optional execution modifiers
  * @returns {Promise<string[]>} Array of tool execution results as JSON strings
  *
  * @example
  * ```typescript
  * // Handle tool calls from a chat completion response
  * const chatCompletion = {
  *   choices: [
  *     {
  *       message: {
  *         tool_calls: [
  *           {
  *             id: 'call_abc123',
  *             type: 'function',
  *             function: {
  *               name: 'SEARCH_TOOL',
  *               arguments: '{"query":"composio documentation"}'
  *             }
  *           }
  *         ]
  *       }
  *     }
  *   ]
  * };
  *
  * const results = await provider.handleToolCalls(
  *   'user123',
  *   chatCompletion,
  *   { connectedAccountId: 'conn_xyz456' }
  * );
  * console.log(results); // Array of tool execution results
  * ```
  */
  async handleToolCalls(userId, chatCompletion, options, modifiers) {
    const outputs = [];
    for (const message of chatCompletion.choices) if (message.message.tool_calls && message.message.tool_calls[0].type === "function") {
      const toolResult = await this.executeToolCall(userId, message.message.tool_calls[0], options, modifiers);
      outputs.push({
        role: "tool",
        tool_call_id: message.message.tool_calls[0].id,
        content: toolResult
      });
    }
    return outputs;
  }
  /**
  * Handles all the tool calls from the OpenAI Assistant API.
  *
  * This method processes tool calls from an OpenAI Assistant run,
  * executes each tool call, and returns the tool outputs for submission.
  *
  * @deprecated Assistant API is deprecated, please use responses or chat completions instead. This method will be removed in the next major version.
  *
  * @param {string} userId - The user ID for authentication and tracking
  * @param {OpenAI.Beta.Threads.Run} run - The Assistant run object containing tool calls
  * @param {ExecuteToolFnOptions} [options] - Optional execution options
  * @param {ExecuteToolModifiers} [modifiers] - Optional execution modifiers
  * @returns {Promise<OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[]>} Array of tool outputs for submission
  *
  *
  * @example
  * ```typescript
  * // Handle tool calls from an OpenAI Assistant run
  * const run = {
  *   id: 'run_abc123',
  *   required_action: {
  *     submit_tool_outputs: {
  *       tool_calls: [
  *         {
  *           id: 'call_xyz789',
  *           type: 'function',
  *           function: {
  *             name: 'SEARCH_TOOL',
  *             arguments: '{"query":"composio documentation"}'
  *           }
  *         }
  *       ]
  *     }
  *   }
  * };
  *
  * const toolOutputs = await provider.handleAssistantMessage(
  *   'user123',
  *   run,
  *   { connectedAccountId: 'conn_xyz456' }
  * );
  *
  * // Submit tool outputs back to OpenAI
  * await openai.beta.threads.runs.submitToolOutputs(
  *   thread.id,
  *   run.id,
  *   { tool_outputs: toolOutputs }
  * );
  * ```
  */
  async handleAssistantMessage(userId, run, options, modifiers) {
    const tool_calls = run.required_action?.submit_tool_outputs?.tool_calls || [];
    return await Promise.all(tool_calls.map(async (tool_call) => {
      logger_default.debug(`Executing tool call: ${tool_call.id}`);
      const tool_response = await this.executeToolCall(userId, tool_call, options, modifiers);
      logger_default.debug(`Tool call ${tool_call.id} executed with response: ${tool_response}`);
      return {
        tool_call_id: tool_call.id,
        output: JSON.stringify(tool_response)
      };
    }));
  }
  /**
  * Waits for the assistant stream and handles the tool calls.
  *
  * This method processes an OpenAI Assistant stream, handles any tool calls
  * that require action, and yields each event from the stream. It's designed
  * for streaming Assistant responses while handling tool calls in real-time.
  *
  * @deprecated Assistant API is deprecated, please use responses or chat completions instead. It will be removed in the next major version.
  *
  * @param {string} userId - The user ID for authentication and tracking
  * @param {OpenAI} client - The OpenAI client instance
  * @param {Stream<OpenAI.Beta.Assistants.AssistantStreamEvent>} runStream - The Assistant run stream
  * @param {OpenAI.Beta.Threads.Thread} thread - The thread object
  * @param {ExecuteToolFnOptions} [options] - Optional execution options
  * @param {ExecuteToolModifiers} [modifiers] - Optional execution modifiers
  * @returns {AsyncGenerator<OpenAI.Beta.Assistants.AssistantStreamEvent, void, unknown>} Generator yielding stream events
  *
  *
  *
  * @example
  * ```typescript
  * // Process an OpenAI Assistant stream with tool calls
  * const thread = await openai.beta.threads.create();
  * const runStream = openai.beta.threads.runs.stream(thread.id, {
  *   assistant_id: 'asst_abc123',
  *   tools: provider.wrapTools(composioTools)
  * });
  *
  * // Process the stream and handle tool calls
  * const streamProcessor = provider.waitAndHandleAssistantStreamToolCalls(
  *   'user123',
  *   openai,
  *   runStream,
  *   thread,
  *   { connectedAccountId: 'conn_xyz456' }
  * );
  *
  * // Consume the stream events
  * for await (const event of streamProcessor) {
  *   if (event.event === 'thread.message.delta') {
  *     console.log(event.data.delta.content);
  *   }
  * }
  * ```
  */
  async *waitAndHandleAssistantStreamToolCalls(userId, client, runStream, thread, options, modifiers) {
    let runId = null;
    for await (const event of runStream) {
      yield event;
      if (event.event === "thread.run.created") {
        const { id } = event.data;
        runId = id;
      }
      if (!runId) continue;
      if (event.event === "thread.run.requires_action") {
        const toolOutputs = await this.handleAssistantMessage(userId, event.data, options, modifiers);
        await client.beta.threads.runs.submitToolOutputs(runId, {
          thread_id: thread.id,
          tool_outputs: toolOutputs
        });
      }
      if ([
        "thread.run.completed",
        "thread.run.failed",
        "thread.run.cancelled",
        "thread.run.expired"
      ].includes(event.event)) break;
    }
    if (!runId) throw new Error("No run ID found");
    let finalRun = await client.beta.threads.runs.retrieve(runId, { thread_id: thread.id });
    while ([
      "queued",
      "in_progress",
      "requires_action"
    ].includes(finalRun.status)) if (finalRun.status === "requires_action") {
      const toolOutputs = await this.handleAssistantMessage(userId, finalRun, options, modifiers);
      finalRun = await client.beta.threads.runs.submitToolOutputs(runId, {
        thread_id: thread.id,
        tool_outputs: toolOutputs
      });
    } else {
      finalRun = await client.beta.threads.runs.retrieve(runId, { thread_id: thread.id });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  /**
  * Waits for the assistant tool calls and handles them.
  *
  * This method polls an OpenAI Assistant run until it completes or requires action,
  * handles any tool calls, and returns the final run object. It's designed for
  * non-streaming Assistant interactions.
  *
  * @deprecated Assistant API is deprecated, please use responses or chat completions instead. It will be removed in the next major version.
  *
  * @param {string} userId - The user ID for authentication and tracking
  * @param {OpenAI} client - The OpenAI client instance
  * @param {OpenAI.Beta.Threads.Run} run - The initial run object
  * @param {OpenAI.Beta.Threads.Thread} thread - The thread object
  * @param {ExecuteToolFnOptions} [options] - Optional execution options
  * @param {ExecuteToolModifiers} [modifiers] - Optional execution modifiers
  * @returns {Promise<OpenAI.Beta.Threads.Run>} The final run object after completion
  *
  * @example
  * ```typescript
  * // Process an OpenAI Assistant run with tool calls
  * const thread = await openai.beta.threads.create();
  * await openai.beta.threads.messages.create(thread.id, {
  *   role: 'user',
  *   content: 'Find information about Composio'
  * });
  *
  * let run = await openai.beta.threads.runs.create(thread.id, {
  *   assistant_id: 'asst_abc123',
  *   tools: provider.wrapTools(composioTools)
  * });
  *
  * // Wait for the run to complete, handling any tool calls
  * run = await provider.waitAndHandleAssistantToolCalls(
  *   'user123',
  *   openai,
  *   run,
  *   thread,
  *   { connectedAccountId: 'conn_xyz456' }
  * );
  *
  * // Get the final messages after run completion
  * const messages = await openai.beta.threads.messages.list(thread.id);
  * console.log(messages.data[0].content);
  * ```
  */
  async waitAndHandleAssistantToolCalls(userId, client, run, thread, options, modifiers) {
    while ([
      "queued",
      "in_progress",
      "requires_action"
    ].includes(run.status)) {
      const tool_outputs = await this.handleAssistantMessage(userId, run, options, modifiers);
      if (run.status === "requires_action") run = await client.beta.threads.runs.submitToolOutputs(run.id, {
        thread_id: thread.id,
        tool_outputs
      });
      else {
        run = await client.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    return run;
  }
};
var version = "0.6.4";
function detectRuntime() {
  const global = globalThis;
  if ("Bun" in global && typeof global.Bun !== "undefined") return "BUN";
  if ("Deno" in global && typeof global.Deno !== "undefined") return "DENO";
  if (typeof process !== "undefined" && process.versions && process.versions.node) return "NODEJS";
  if ("caches" in global && typeof global.caches !== "undefined" && "WebSocketPair" in global && typeof global.WebSocketPair !== "undefined") return "CLOUDFLARE_WORKERS";
  if ("EdgeRuntime" in global && typeof global.EdgeRuntime !== "undefined") return "VERCEL_EDGE";
  if ("ServiceWorkerGlobalScope" in global && typeof global.ServiceWorkerGlobalScope !== "undefined") {
    const ServiceWorkerScope = global.ServiceWorkerGlobalScope;
    if (ServiceWorkerScope && global instanceof ServiceWorkerScope) return "SERVICE_WORKER";
  }
  if ("WorkerGlobalScope" in global && typeof global.WorkerGlobalScope !== "undefined" && "importScripts" in global && typeof global.importScripts === "function") return "WEB_WORKER";
  if (typeof navigator !== "undefined" && navigator.product === "ReactNative") return "REACT_NATIVE";
  if (typeof window !== "undefined" && typeof document !== "undefined") return "BROWSER";
  return "UNKNOWN";
}
__name(detectRuntime, "detectRuntime");
var RUNTIME_ENV = detectRuntime();
function getSessionHeaders(provider) {
  return {
    "x-framework": provider?.name || "unknown",
    "x-source": "TYPESCRIPT_SDK",
    "x-runtime": RUNTIME_ENV,
    "x-sdk-version": version
  };
}
__name(getSessionHeaders, "getSessionHeaders");
var getDefaultHeaders = /* @__PURE__ */ __name((headers, provider) => {
  const sessionHeaders = getSessionHeaders(provider);
  return {
    ...headers || {},
    ...sessionHeaders
  };
}, "getDefaultHeaders");
var MCPServerTypeSchema = v3_default.enum(["http", "sse"]);
var ToolRouterConfigManageConnectionsSchema = v3_default.object({
  enable: v3_default.boolean().default(true).optional().describe("Whether to use tools to manage connections in the tool router session. Defaults to true, if set to false, you need to manage connections manually"),
  callbackUrl: v3_default.string().optional().describe("The callback uri to use in the tool router session"),
  waitForConnections: v3_default.boolean().optional().describe("Whether to wait for users to finish authenticating connections before proceeding to the next step. Defaults to false, if set to true, a wait for connections tool call will happen and finish when the connections are ready")
}).strict();
var ToolRouterToolkitsParamSchema = v3_default.array(v3_default.string()).describe("List of toolkits to enable in the tool router session");
var ToolRouterToolkitsDisabledConfigSchema = v3_default.object({ disable: ToolRouterToolkitsParamSchema.describe("List of toolkits to disable in the tool router session") }).strict();
var ToolRouterToolkitsEnabledConfigSchema = v3_default.object({ enable: ToolRouterToolkitsParamSchema.describe("List of toolkits to enable in the tool router session") }).strict();
var ToolRouterManageConnectionsConfigSchema = v3_default.object({
  enable: v3_default.boolean().optional().describe("Whether to use tools to manage connections in the tool router session. Defaults to true, if set to false, you need to manage connections manually").default(true),
  callbackUrl: v3_default.string().optional().describe("The callback url to use in the tool router session")
});
var ToolRouterTagsParamSchema = v3_default.array(v3_default.enum([
  "readOnlyHint",
  "destructiveHint",
  "idempotentHint",
  "openWorldHint"
])).describe("The tags to filter the tools by");
var ToolRouterTagsEnableDisableSchema = v3_default.object({
  enable: ToolRouterTagsParamSchema.optional().describe("The tags to enable in the tool router session"),
  disable: ToolRouterTagsParamSchema.optional().describe("The tags to disable in the tool router session")
}).strict();
var ToolRouterConfigTagsSchema = v3_default.union([ToolRouterTagsParamSchema, ToolRouterTagsEnableDisableSchema]).describe("The tags to use in the tool router session");
var ToolRouterToolsParamSchema = v3_default.array(v3_default.string()).describe("The tools to use in the tool router session");
var ToolRouterConfigToolsSchema = v3_default.union([
  ToolRouterToolsParamSchema,
  v3_default.object({ enable: ToolRouterToolsParamSchema.describe("The tools to enable in the tool router session") }).strict(),
  v3_default.object({ disable: ToolRouterToolsParamSchema.describe("The tools to disable in the tool router session") }).strict(),
  v3_default.object({ tags: ToolRouterConfigTagsSchema.describe("The tags to filter the tools by, this will override the global tags") }).strict()
]).superRefine((val, ctx) => {
  if (typeof val === "object" && !Array.isArray(val)) {
    const keys = Object.keys(val);
    if (keys.length > 1) ctx.addIssue({
      code: v3_default.ZodIssueCode.custom,
      message: `Only one of 'enable', 'disable', or 'tags' can be specified, but found: ${keys.join(", ")}`,
      path: keys
    });
  }
});
var ToolRouterCreateSessionConfigSchema = v3_default.object({
  tools: v3_default.record(v3_default.string(), v3_default.union([ToolRouterToolsParamSchema, ToolRouterConfigToolsSchema])).optional().describe("The tools to use in the tool router session"),
  tags: ToolRouterConfigTagsSchema.optional().describe("Global tags to filter the tools by"),
  toolkits: v3_default.union([
    ToolRouterToolkitsParamSchema,
    ToolRouterToolkitsDisabledConfigSchema,
    ToolRouterToolkitsEnabledConfigSchema
  ]).optional().describe("The toolkits to use in the tool router session"),
  authConfigs: v3_default.record(v3_default.string(), v3_default.string()).describe("The auth configs to use in the tool router session. The key is the toolkit slug, the value is the auth config id.").default({}),
  connectedAccounts: v3_default.record(v3_default.string(), v3_default.string()).describe("The connected accounts to use in the tool router session. The key is the toolkit slug, the value is the connected account id.").default({}),
  manageConnections: v3_default.union([v3_default.boolean(), ToolRouterConfigManageConnectionsSchema]).optional().default(true).describe("The config for the manage connections in the tool router session. Defaults to true, if set to false, you need to manage connections manually. If set to an object, you can configure the manage connections settings."),
  workbench: v3_default.object({
    enableProxyExecution: v3_default.boolean().optional().describe("Whether to enable proxy execution in the tool router session"),
    autoOffloadThreshold: v3_default.number().optional().describe("The auto offload threshold in characters for the tool execution to be moved into workbench")
  }).optional().describe("The execution config for the tool router session"),
  experimental: v3_default.object({ assistivePrompt: v3_default.object({ userTimezone: v3_default.string().optional().describe('IANA timezone identifier (e.g., "America/New_York", "Europe/London") for timezone-aware assistive prompts') }).optional().describe("Configuration for assistive prompt generation") }).optional().describe("Experimental features configuration - not stable, may be modified or removed")
}).partial().describe("The config for the tool router session");
var ToolkitConnectionStateSchema = v3_default.object({
  slug: v3_default.string().describe("The slug of a toolkit"),
  name: v3_default.string().describe("The name of a toolkit"),
  logo: v3_default.string().optional().describe("The logo of a toolkit"),
  isNoAuth: v3_default.boolean().default(false).describe("Whether the toolkit is no auth or not"),
  connection: v3_default.object({
    isActive: v3_default.boolean().describe("Whether the connection is active or not"),
    authConfig: v3_default.object({
      id: v3_default.string().describe("The id of the auth config"),
      mode: v3_default.string().describe("The auth scheme used by the auth config"),
      isComposioManaged: v3_default.boolean().describe("Whether the auth config is managed by Composio")
    }).nullish().describe("The auth config of a toolkit"),
    connectedAccount: v3_default.object({
      id: v3_default.string().describe("The id of the connected account"),
      status: v3_default.string().describe("The status of the connected account")
    }).optional().describe("The connected account of a toolkit")
  }).optional().describe("The connection of a toolkit")
}).describe("The connection state of a toolkit");
var ToolkitConnectionsDetailsSchema = v3_default.object({
  items: v3_default.array(ToolkitConnectionStateSchema),
  nextCursor: v3_default.string().optional(),
  totalPages: v3_default.number()
});
var ToolRouterMCPServerConfigSchema = v3_default.object({
  type: MCPServerTypeSchema,
  url: v3_default.string(),
  headers: v3_default.record(v3_default.string(), v3_default.string()).optional()
});
var ToolRouterToolkitsOptionsSchema = v3_default.object({
  toolkits: v3_default.array(v3_default.string()).optional(),
  nextCursor: v3_default.string().optional(),
  limit: v3_default.number().optional(),
  isConnected: v3_default.boolean().optional(),
  search: v3_default.string().optional()
});
var transformToolRouterToolsParams = /* @__PURE__ */ __name((params) => {
  if (!params) return;
  if (typeof params === "object") return Object.keys(params).reduce((acc, key) => {
    if (Array.isArray(params[key])) acc[key] = { enable: params[key] };
    else if (typeof params[key] === "object") {
      const parsedResult = ToolRouterConfigToolsSchema.safeParse(params[key]);
      if (parsedResult.success) {
        const data = parsedResult.data;
        if (Array.isArray(data)) acc[key] = { enable: data };
        else if ("enable" in data) acc[key] = { enable: data.enable };
        else if ("disable" in data) acc[key] = { disable: data.disable };
        else if ("tags" in data) {
          const tags = transformToolRouterTagsParams(data.tags);
          if (tags) acc[key] = { tags };
        }
      } else throw new ValidationError(parsedResult.error.message);
    } else acc[key] = { enable: params[key] };
    return acc;
  }, {});
}, "transformToolRouterToolsParams");
var transformToolRouterTagsParams = /* @__PURE__ */ __name((params) => {
  if (!params) return;
  if (Array.isArray(params)) return { enable: params };
  else if (typeof params === "object") return {
    enable: params.enable,
    disable: params.disable
  };
}, "transformToolRouterTagsParams");
var transformToolRouterManageConnectionsParams = /* @__PURE__ */ __name((params) => {
  if (params === void 0) return { enable: true };
  if (typeof params === "boolean") return { enable: params };
  const parsedResult = ToolRouterConfigManageConnectionsSchema.safeParse(params);
  if (!parsedResult.success) throw new ValidationError("Failed to parse manage connections config", { cause: parsedResult.error });
  const config = parsedResult.data;
  return {
    enable: config.enable ?? true,
    callback_url: config.callbackUrl,
    enable_wait_for_connections: config.waitForConnections
  };
}, "transformToolRouterManageConnectionsParams");
var transformToolRouterWorkbenchParams = /* @__PURE__ */ __name((params) => {
  if (!params) return;
  return {
    enable_proxy_execution: params.enableProxyExecution,
    auto_offload_threshold: params.autoOffloadThreshold
  };
}, "transformToolRouterWorkbenchParams");
var transformToolRouterToolkitsParams = /* @__PURE__ */ __name((params) => {
  if (!params) return;
  if (Array.isArray(params)) return { enable: params };
  return params;
}, "transformToolRouterToolkitsParams");
var ToolRouter2 = class {
  static {
    __name(this, "ToolRouter");
  }
  constructor(client, config) {
    this.client = client;
    this.config = config;
    telemetry.instrument(this, "ToolRouter");
  }
  /**
  * Creates a function that authorizes a toolkit for a user.
  * @param sessionId {string} The session id to create the authorize function for
  * @returns {ToolRouterAuthorizeFn} The authorize function
  *
  */
  createAuthorizeFn = /* @__PURE__ */ __name((sessionId) => {
    const authorizeFn = /* @__PURE__ */ __name(async (toolkit, options) => {
      const response = await this.client.toolRouter.session.link(sessionId, {
        ...options?.callbackUrl ? { callback_url: options.callbackUrl } : {},
        toolkit
      });
      return createConnectionRequest(this.client, response.connected_account_id, ConnectedAccountStatuses.INITIATED, response.redirect_url);
    }, "authorizeFn");
    return authorizeFn;
  }, "createAuthorizeFn");
  /**
  *
  * @param sessionId {string} The session id to create the toolkits function for
  * @returns {ToolRouterToolkitsFn} The toolkits function
  *
  * @example
  * ```typescript
  * import { Composio } from '@composio/core';
  *
  * const composio = new Composio();
  * const session = await composio.toolRouter.use('session_123');
  *
  * const toolkits = await session.toolkits();
  * console.log(toolkits);
  * ```
  */
  createToolkitsFn = /* @__PURE__ */ __name((sessionId) => {
    const connectionsFn = /* @__PURE__ */ __name(async (options) => {
      const toolkitOptions = ToolRouterToolkitsOptionsSchema.safeParse(options ?? {});
      if (!toolkitOptions.success) throw new ValidationError("Failed to parse toolkits options", { cause: toolkitOptions.error });
      const result = await this.client.toolRouter.session.toolkits(sessionId, {
        cursor: toolkitOptions.data.nextCursor,
        limit: toolkitOptions.data.limit,
        toolkits: toolkitOptions.data.toolkits,
        is_connected: toolkitOptions.data.isConnected,
        search: toolkitOptions.data.search
      });
      return {
        items: result.items.map((item) => {
          return transform(item).with(ToolkitConnectionStateSchema).using((item$1) => ({
            slug: item$1.slug,
            name: item$1.name,
            logo: item$1.meta?.logo,
            isNoAuth: item$1.is_no_auth,
            connection: item$1.is_no_auth ? void 0 : {
              isActive: item$1.connected_account?.status === "ACTIVE",
              authConfig: item$1.connected_account && {
                id: item$1.connected_account?.auth_config.id,
                mode: item$1.connected_account?.auth_config.auth_scheme,
                isComposioManaged: item$1.connected_account?.auth_config.is_composio_managed
              },
              connectedAccount: item$1.connected_account ? {
                id: item$1.connected_account.id,
                status: item$1.connected_account.status
              } : void 0
            }
          }));
        }),
        nextCursor: result.next_cursor,
        totalPages: result.total_pages
      };
    }, "connectionsFn");
    return connectionsFn;
  }, "createToolkitsFn");
  /**
  * @internal
  * Creates a function that wraps the tools based on the provider.
  * The returned tools will be of the type the frameworks expects.
  *
  * @param sessionId - The session id to get the tools for
  * @returns A function that wraps the tools based on the provider with session-specific modifiers.
  */
  createToolsFn = /* @__PURE__ */ __name((sessionId) => {
    return async (modifiers) => {
      const ToolsModel = new Tools3(this.client, this.config);
      const tools = await ToolsModel.getRawToolRouterMetaTools(sessionId, modifiers?.modifySchema ? { modifySchema: modifiers?.modifySchema } : void 0);
      return ToolsModel.wrapToolsForToolRouter(sessionId, tools, modifiers);
    };
  }, "createToolsFn");
  /**
  * Creates a MCP server config object.
  * @param type {MCPServerType} The type of the MCP server
  * @param url {string} The URL of the MCP server
  * @returns {ToolRouterMCPServerConfig} The MCP server config object
  */
  createMCPServerConfig = /* @__PURE__ */ __name(({ type, url }) => {
    return {
      type,
      url,
      headers: { ...this.config?.apiKey ? { "x-api-key": this.config?.apiKey } : {} }
    };
  }, "createMCPServerConfig");
  /**
  * Creates a new tool router session for a user.
  *
  * @param userId {string} The user id to create the session for
  * @param config {ToolRouterCreateSessionConfig} The config for the tool router session
  * @returns {Promise<ToolRouterSession<TToolCollection, TTool, TProvider>>} The tool router session
  *
  * @example
  * ```typescript
  * import { Composio } from '@composio/core';
  *
  * const composio = new Composio();
  * const userId = 'user_123';
  *
  * const session = await composio.experimental.create(userId, {
  *   toolkits: ['gmail'],
  *   manageConnections: true,
  *   tools: {
  *     gmail: {
  *       disabled: ['gmail_send_email']
  *     }
  *   },
  *   tags: ['readOnlyHint']
  * });
  *
  * console.log(session.sessionId);
  * console.log(session.mcp.url);
  *
  * // Get tools formatted for your framework (requires provider)
  * const tools = await session.tools();
  *
  * // Check toolkit connection states
  * const toolkits = await session.toolkits();
  * ```
  */
  async create(userId, config) {
    const routerConfig = ToolRouterCreateSessionConfigSchema.parse(config ?? {});
    const payload = {
      user_id: userId,
      auth_configs: routerConfig.authConfigs,
      connected_accounts: routerConfig.connectedAccounts,
      toolkits: transformToolRouterToolkitsParams(routerConfig.toolkits),
      tools: transformToolRouterToolsParams(routerConfig.tools),
      tags: transformToolRouterTagsParams(routerConfig.tags),
      manage_connections: transformToolRouterManageConnectionsParams(routerConfig.manageConnections),
      workbench: transformToolRouterWorkbenchParams(routerConfig.workbench),
      experimental: routerConfig.experimental?.assistivePrompt?.userTimezone ? { assistive_prompt_config: { user_timezone: routerConfig.experimental.assistivePrompt.userTimezone } } : void 0
    };
    const session = await this.client.toolRouter.session.create(payload);
    const experimental = session.experimental ? { assistivePrompt: session.experimental.assistive_prompt } : void 0;
    return {
      sessionId: session.session_id,
      mcp: this.createMCPServerConfig(session.mcp),
      tools: this.createToolsFn(session.session_id),
      authorize: this.createAuthorizeFn(session.session_id),
      toolkits: this.createToolkitsFn(session.session_id),
      experimental
    };
  }
  /**
  * Use an existing session
  * @param id {string} The id of the session to use
  * @returns {Promise<ToolRouterSession<TToolCollection, TTool, TProvider>>} The tool router session
  *
  * @example
  * ```typescript
  * import { Composio } from '@composio/core';
  *
  * const composio = new Composio();
  * const id = 'session_123';
  * const session = await composio.toolRouter.use(id);
  *
  * console.log(session.mcp.url);
  * console.log(session.mcp.headers);
  * ```
  */
  async use(id) {
    const session = await this.client.toolRouter.session.retrieve(id);
    return {
      sessionId: session.session_id,
      mcp: this.createMCPServerConfig(session.mcp),
      tools: this.createToolsFn(session.session_id),
      authorize: this.createAuthorizeFn(session.session_id),
      toolkits: this.createToolkitsFn(session.session_id)
    };
  }
};
var Composio2 = class Composio3 {
  static {
    __name(this, "Composio");
  }
  /**
  * The Composio API client.
  * @type {ComposioClient}
  */
  client;
  /**
  * The configuration for the Composio SDK.
  * @type {ComposioConfig<TProvider>}
  */
  config;
  /**
  * Core models for Composio.
  */
  /** List, retrieve, and execute tools */
  tools;
  /** Retrieve toolkit metadata and authorize user connections */
  toolkits;
  /** Manage webhook triggers and event subscriptions */
  triggers;
  /** The tool provider instance used for wrapping tools in framework-specific formats */
  provider;
  /** Upload and download files */
  files;
  /** Manage authentication configurations for toolkits */
  authConfigs;
  /** Manage authenticated connections */
  connectedAccounts;
  /** Model Context Protocol server management */
  mcp;
  /**
  * Experimental feature, use with caution
  * @experimental
  */
  toolRouter;
  /**
  * Creates a new tool router session for a user.
  *
  * @param userId {string} The user id to create the session for
  * @param config {ToolRouterConfig} The config for the tool router session
  * @returns {Promise<ToolRouterSession<TToolCollection, TTool, TProvider>>} The tool router session
  *
  * @example
  * ```typescript
  * import { Composio } from '@composio/core';
  *
  * const composio = new Composio();
  * const userId = 'user_123';
  *
  * const session = await composio.create(userId, {
  *  manageConnections: true,
  * });
  *
  * console.log(session.sessionId);
  * console.log(session.url);
  * console.log(session.tools());
  * ```
  */
  create;
  /**
  * Use an existing tool router session
  *
  * @param id {string} The id of the session to use
  * @returns {Promise<ToolRouterSession<TToolCollection, TTool, TProvider>>} The tool router session
  */
  use;
  /**
  * Creates a new instance of the Composio SDK.
  *
  * The constructor initializes the SDK with the provided configuration options,
  * sets up the API client, and initializes all core models (tools, toolkits, etc.).
  *
  * @param {ComposioConfig<TProvider>} config - Configuration options for the Composio SDK
  * @param {string} [config.apiKey] - The API key for authenticating with the Composio API
  * @param {string} [config.baseURL] - The base URL for the Composio API (defaults to production URL)
  * @param {boolean} [config.allowTracking=true] - Whether to allow anonymous usage analytics
  * @param {TProvider} [config.provider] - The provider to use for this Composio instance (defaults to OpenAIProvider)
  *
  * @example
  * ```typescript
  * // Initialize with default configuration
  * const composio = new Composio();
  *
  * // Initialize with custom API key and base URL
  * const composio = new Composio({
  *   apiKey: 'your-api-key',
  *   baseURL: 'https://api.composio.dev'
  * });
  *
  * // Initialize with custom provider
  * const composio = new Composio({
  *   apiKey: 'your-api-key',
  *   provider: new CustomProvider()
  * });
  * ```
  */
  constructor(config) {
    const { baseURL: baseURLParsed, apiKey: apiKeyParsed } = getSDKConfig(config?.baseURL, config?.apiKey);
    if (IS_DEVELOPMENT_OR_CI) logger_default.debug(`Initializing Composio w API Key: [REDACTED] and baseURL: ${baseURLParsed}`);
    this.provider = config?.provider ?? new OpenAIProvider();
    this.config = {
      ...config,
      baseURL: baseURLParsed,
      apiKey: apiKeyParsed,
      toolkitVersions: getToolkitVersionsFromEnv(config?.toolkitVersions),
      allowTracking: config?.allowTracking ?? CONFIG_DEFAULTS.allowTracking,
      autoUploadDownloadFiles: config?.autoUploadDownloadFiles ?? CONFIG_DEFAULTS.autoUploadDownloadFiles,
      provider: config?.provider ?? this.provider
    };
    this.client = new Composio({
      apiKey: apiKeyParsed,
      baseURL: baseURLParsed,
      defaultHeaders: getDefaultHeaders(this.config.defaultHeaders, this.provider),
      logLevel: COMPOSIO_LOG_LEVEL
    });
    this.tools = new Tools3(this.client, this.config);
    this.mcp = new MCP(this.client);
    this.toolkits = new Toolkits2(this.client);
    this.triggers = new Triggers2(this.client, this.config);
    this.authConfigs = new AuthConfigs2(this.client);
    this.files = new Files5(this.client);
    this.connectedAccounts = new ConnectedAccounts2(this.client);
    this.toolRouter = new ToolRouter2(this.client, this.config);
    this.create = this.toolRouter.create.bind(this.toolRouter);
    this.use = this.toolRouter.use.bind(this.toolRouter);
    if (this.config.allowTracking) telemetry.setup({
      apiKey: apiKeyParsed ?? "",
      baseUrl: baseURLParsed ?? "",
      isAgentic: this.provider?._isAgentic || false,
      version,
      isBrowser: typeof window !== "undefined",
      provider: this.provider?.name ?? "openai",
      host: this.config.host
    });
    telemetry.instrument(this, "Composio");
    telemetry.instrument(this.provider, this.provider.name ?? this.provider.constructor.name ?? "unknown");
    if (!this.config.disableVersionCheck) checkForLatestVersionFromNPM(version);
  }
  /**
  * Get the Composio SDK client.
  * @returns {ComposioClient} The Composio API client.
  */
  getClient() {
    if (!this.client) throw new Error("Composio client is not initialized. Please initialize it first.");
    return this.client;
  }
  /**
  * Get the configuration SDK is initialized with
  * @returns {ComposioConfig<TProvider>} The configuration SDK is initialized with
  */
  getConfig() {
    return this.config;
  }
  /**
  * Creates a new instance of the Composio SDK with custom request options while preserving the existing configuration.
  * This method is particularly useful when you need to:
  * - Add custom headers for specific requests
  * - Track request contexts with unique identifiers
  * - Override default request behavior for a subset of operations
  *
  * The new instance inherits all configuration from the parent instance (apiKey, baseURL, provider, etc.)
  * but allows you to specify custom request options that will be used for all API calls made through this session.
  *
  * @deprecated DEPRECATED: This method will be removed in a future version of the SDK.
  *
  * @param {MergedRequestInit} fetchOptions - Custom request options to be used for all API calls in this session.
  *                                          This follows the Fetch API RequestInit interface with additional options.
  * @returns {Composio<TProvider>} A new Composio instance with the custom request options applied.
  *
  * @example
  * ```typescript
  * // Create a base Composio instance
  * const composio = new Composio({
  *   apiKey: 'your-api-key'
  * });
  *
  * // Create a session with request tracking headers
  * const composioWithCustomHeaders = composio.createSession({
  *   headers: {
  *     'x-request-id': '1234567890',
  *     'x-correlation-id': 'session-abc-123',
  *     'x-custom-header': 'custom-value'
  *   }
  * });
  *
  * // Use the session for making API calls with the custom headers
  * await composioWithCustomHeaders.tools.list();
  * ```
  */
  createSession(options) {
    const sessionHeaders = getDefaultHeaders(options?.headers, this.provider);
    return new Composio3({
      ...this.config,
      defaultHeaders: sessionHeaders
    });
  }
  /**
  * Flush any pending telemetry and wait for it to complete.
  *
  * In Node.js-compatible environments, telemetry is automatically flushed on process exit.
  * However, in environments like Cloudflare Workers that don't support process exit events,
  * you should call this method manually to ensure all telemetry is sent.
  *
  * @returns {Promise<void>} A promise that resolves when all pending telemetry has been sent.
  *
  * @example
  * ```typescript
  * // In a Cloudflare Worker, use ctx.waitUntil to ensure telemetry is flushed
  * export default {
  *   async fetch(request: Request, env: Env, ctx: ExecutionContext) {
  *     const composio = new Composio({ apiKey: env.COMPOSIO_API_KEY });
  *
  *     // Do your work...
  *     const result = await composio.tools.execute(...);
  *
  *     // Ensure telemetry flushes before worker terminates
  *     ctx.waitUntil(composio.flush());
  *
  *     return new Response(JSON.stringify(result));
  *   }
  * };
  * ```
  */
  async flush() {
    await telemetry.flush();
  }
};
var ComposioProvider = class extends BaseNonAgenticProvider {
  static {
    __name(this, "ComposioProvider");
  }
  name = "ComposioProvider";
  constructor() {
    super();
  }
  wrapTool = /* @__PURE__ */ __name((tool) => {
    return tool;
  }, "wrapTool");
  wrapTools(tools) {
    return tools.map((tool) => this.wrapTool(tool));
  }
};
var removeNonRequiredProperties = /* @__PURE__ */ __name((schema) => {
  if (schema && schema.type === "object" && schema.required?.length) schema.properties = Object.fromEntries(Object.entries(schema.properties || {}).filter(([key]) => schema.required.includes(key)));
  schema.additionalProperties = false;
  return schema;
}, "removeNonRequiredProperties");
function jsonSchemaToZodSchema(jsonSchema, { strict } = { strict: false }) {
  try {
    let schema = jsonSchema;
    if (strict && schema) schema = removeNonRequiredProperties(schema);
    return jsonSchemaToZod(schema);
  } catch (error) {
    throw new JsonSchemaToZodError("Failed to convert JSON Schema to Zod Schema", { cause: error });
  }
}
__name(jsonSchemaToZodSchema, "jsonSchemaToZodSchema");
var AuthScheme = class {
  static {
    __name(this, "AuthScheme");
  }
  /**
  * Creates a ConnectionData object for OAuth2 authentication
  * @param params The OAuth2 parameters
  * @returns ConnectionData object
  */
  static OAuth2(params) {
    return {
      authScheme: AuthSchemeTypes.OAUTH2,
      val: {
        status: ConnectionStatuses.INITIALIZING,
        ...params
      }
    };
  }
  /**
  * Creates a ConnectionData object for OAuth1 authentication
  * @param params The OAuth1 parameters
  * @returns ConnectionData object
  */
  static OAuth1(params) {
    return {
      authScheme: AuthSchemeTypes.OAUTH1,
      val: {
        status: ConnectionStatuses.INITIALIZING,
        ...params
      }
    };
  }
  /**
  * Creates a ConnectionData object for API Key authentication
  * @param params The API key parameters
  * @returns ConnectionData object
  */
  static APIKey(params) {
    return {
      authScheme: AuthSchemeTypes.API_KEY,
      val: {
        status: ConnectionStatuses.ACTIVE,
        ...params
      }
    };
  }
  /**
  * Creates a ConnectionData object for Basic authentication
  * @param params The basic auth parameters
  * @returns ConnectionData object
  */
  static Basic(params) {
    return {
      authScheme: AuthSchemeTypes.BASIC,
      val: {
        status: ConnectionStatuses.ACTIVE,
        ...params
      }
    };
  }
  /**
  * Creates a ConnectionData object for Bearer Token authentication
  * @param params The bearer token parameters
  * @returns ConnectionData object
  */
  static BearerToken(params) {
    return {
      authScheme: AuthSchemeTypes.BEARER_TOKEN,
      val: {
        status: ConnectionStatuses.ACTIVE,
        ...params
      }
    };
  }
  /**
  * Creates a ConnectionData object for Google Service Account authentication
  * @param params The Google service account parameters
  * @returns ConnectionData object
  */
  static GoogleServiceAccount(params) {
    return {
      authScheme: AuthSchemeTypes.GOOGLE_SERVICE_ACCOUNT,
      val: {
        status: ConnectionStatuses.ACTIVE,
        ...params
      }
    };
  }
  /**
  * Creates a ConnectionData object for No Auth authentication
  * @returns ConnectionData object
  */
  static NoAuth(params) {
    return {
      authScheme: AuthSchemeTypes.NO_AUTH,
      val: {
        status: ConnectionStatuses.ACTIVE,
        ...params ?? {}
      }
    };
  }
  /**
  * Creates a ConnectionData object for Basic with JWT authentication
  * @param params The basic with JWT parameters
  * @returns ConnectionData object
  */
  static BasicWithJWT(params) {
    return {
      authScheme: AuthSchemeTypes.BASIC_WITH_JWT,
      val: {
        status: ConnectionStatuses.ACTIVE,
        ...params
      }
    };
  }
  /**
  * Creates a ConnectionData object for Cal.com authentication
  * @returns ConnectionData object
  */
  static CalcomAuth(params) {
    return {
      authScheme: AuthSchemeTypes.CALCOM_AUTH,
      val: {
        status: ConnectionStatuses.ACTIVE,
        ...params ?? {}
      }
    };
  }
  /**
  * Creates a ConnectionData object for Bill.com authentication
  * @param params The Bill.com auth parameters
  * @returns ConnectionData object
  */
  static BillcomAuth(params) {
    return {
      authScheme: AuthSchemeTypes.BILLCOM_AUTH,
      val: {
        status: ConnectionStatuses.ACTIVE,
        ...params
      }
    };
  }
};
var WebhookEventTypes = {
  CONNECTION_EXPIRED: "composio.connected_account.expired",
  TRIGGER_MESSAGE: "composio.trigger.message"
};
var WebhookConnectedAccountAuthConfigSchema = external_exports.object({
  id: external_exports.string(),
  auth_scheme: external_exports.nativeEnum(AuthSchemeTypes),
  is_composio_managed: external_exports.boolean(),
  is_disabled: external_exports.boolean(),
  deprecated: external_exports.object({ uuid: external_exports.string() }).optional()
}).passthrough();
var WebhookConnectionStateSchema = external_exports.object({
  authScheme: external_exports.nativeEnum(AuthSchemeTypes),
  val: external_exports.record(external_exports.unknown())
}).passthrough();
var SingleConnectedAccountDetailedResponseSchema = external_exports.object({
  toolkit: external_exports.object({ slug: external_exports.string().describe("The slug of the toolkit") }).passthrough(),
  auth_config: WebhookConnectedAccountAuthConfigSchema,
  id: external_exports.string(),
  user_id: external_exports.string(),
  status: external_exports.nativeEnum(ConnectionStatuses),
  created_at: external_exports.string(),
  updated_at: external_exports.string(),
  state: WebhookConnectionStateSchema,
  data: external_exports.record(external_exports.unknown()),
  params: external_exports.record(external_exports.unknown()),
  status_reason: external_exports.string().nullable(),
  is_disabled: external_exports.boolean(),
  test_request_endpoint: external_exports.string().optional(),
  deprecated: external_exports.object({
    labels: external_exports.array(external_exports.string()),
    uuid: external_exports.string()
  }).optional()
}).passthrough();
var WebhookConnectionMetadataSchema = external_exports.object({
  project_id: external_exports.string(),
  org_id: external_exports.string()
}).passthrough();
var ConnectionExpiredEventSchema = external_exports.object({
  id: external_exports.string(),
  timestamp: external_exports.string(),
  type: external_exports.literal(WebhookEventTypes.CONNECTION_EXPIRED),
  data: SingleConnectedAccountDetailedResponseSchema,
  metadata: WebhookConnectionMetadataSchema
}).passthrough();
var WebhookEventSchema = external_exports.discriminatedUnion("type", [ConnectionExpiredEventSchema]);
var MCPToolkitConfigSchema = external_exports.object({
  toolkit: external_exports.string().min(1, "Toolkit name cannot be empty"),
  authConfigId: external_exports.string().min(1, "Auth config ID cannot be empty"),
  allowedTools: external_exports.array(external_exports.string().min(1, "Tool name cannot be empty")).min(1, "At least one tool must be specified")
});
var MCPToolkitConfigsArraySchema = external_exports.array(MCPToolkitConfigSchema).min(1, "At least one toolkit configuration is required").refine((configs) => {
  const toolkits = configs.map((config) => config.toolkit);
  return new Set(toolkits).size === toolkits.length;
}, "Duplicate toolkits are not allowed. Each toolkit must be unique.");
var MCPAuthOptionsSchema = external_exports.object({ isChatAuth: external_exports.boolean().optional() });
var MCPGetServerParamsSchema = external_exports.object({
  userId: external_exports.string().min(1, "User ID cannot be empty").optional(),
  connectedAccountIds: external_exports.record(external_exports.string(), external_exports.string().min(1, "Account ID cannot be empty")).optional()
}).refine((data) => {
  return !!data.userId !== (!!data.connectedAccountIds && Object.keys(data.connectedAccountIds).length > 0);
}, { message: "Must provide either userId or connectedAccountIds, but not both" });
var MCPGenerateURLParamsSchema = external_exports.object({
  userIds: external_exports.array(external_exports.string()).optional(),
  connectedAccountIds: external_exports.array(external_exports.string()).optional(),
  isChatAuth: external_exports.boolean().optional()
});
var ComposioGenerateURLParamsSchema = external_exports.object({
  user_ids: external_exports.array(external_exports.string()).optional(),
  connected_account_ids: external_exports.array(external_exports.string()).optional(),
  mcp_server_id: external_exports.string(),
  managed_auth_by_composio: external_exports.boolean().optional()
});
var GenerateURLParamsSchema = external_exports.object({
  userIds: external_exports.array(external_exports.string()).optional(),
  connectedAccountIds: external_exports.array(external_exports.string()).optional(),
  mcpServerId: external_exports.string(),
  composioManagedAuth: external_exports.boolean().optional()
});
var GenerateURLResponseSchema = external_exports.object({
  connectedAccountUrls: external_exports.array(external_exports.string()).optional(),
  userIdsUrl: external_exports.array(external_exports.string()).optional(),
  mcpUrl: external_exports.string().min(1, "MCP URL cannot be empty")
});
var ComposioGenerateURLResponseSchema = external_exports.object({
  connected_account_urls: external_exports.array(external_exports.string()).optional(),
  user_ids_url: external_exports.array(external_exports.string()).optional(),
  mcp_url: external_exports.string().min(1, "MCP URL cannot be empty")
});
var MCPSingleAppServerSchema = external_exports.object({
  name: external_exports.string().describe("Name of the MCP server"),
  tools: external_exports.array(external_exports.string()).describe("List of allowed tools"),
  authConfigId: external_exports.string().optional().describe("Auth config ID for the server")
});
var MCPMultiAppServerSchema = external_exports.object({
  name: external_exports.string().describe("Name of the MCP server"),
  tools: external_exports.array(external_exports.string()).describe("List of allowed tools across toolkits"),
  toolkits: external_exports.array(external_exports.string()).describe("List of allowed toolkits")
});
var MCPServerSchema = external_exports.object({
  id: external_exports.string().describe("Unique identifier for the MCP server"),
  type: external_exports.enum(["single", "multi"]).describe("Type of MCP server"),
  createdAt: external_exports.string().describe("Creation timestamp"),
  updatedAt: external_exports.string().describe("Last update timestamp"),
  status: external_exports.enum([
    "active",
    "inactive",
    "error"
  ]).default("active"),
  config: external_exports.union([MCPSingleAppServerSchema, MCPMultiAppServerSchema])
});
var MCPServerListResponseSchema = external_exports.object({
  items: external_exports.array(MCPServerSchema),
  total: external_exports.number(),
  page: external_exports.number(),
  pageSize: external_exports.number()
});
var MCPServerUpdateParamsSchema = external_exports.object({
  name: external_exports.string().optional().describe("New name for the server"),
  toolkits: external_exports.array(external_exports.string()).optional().describe("Updated list of toolkits"),
  allowedTools: external_exports.array(external_exports.string()).optional().describe("Updated list of allowed tools")
});
var MCPServerCreateResponseSchema = MCPServerSchema;
var ConnectionStatus = /* @__PURE__ */ function(ConnectionStatus$1) {
  ConnectionStatus$1["CONNECTED"] = "CONNECTED";
  ConnectionStatus$1["DISCONNECTED"] = "DISCONNECTED";
  return ConnectionStatus$1;
}({});
var CustomCreateResponseSchema = external_exports.object({
  id: external_exports.string().min(1, "Server ID cannot be empty"),
  name: external_exports.string().min(1, "Server name cannot be empty"),
  createdAt: external_exports.string().nullish(),
  updatedAt: external_exports.string().nullish(),
  status: external_exports.string().nullish()
});
var ComposioCustomCreateResponseSchema = external_exports.object({
  id: external_exports.string().min(1, "Server ID cannot be empty"),
  name: external_exports.string().min(1, "Server name cannot be empty"),
  created_at: external_exports.string().nullish(),
  updated_at: external_exports.string().nullish(),
  status: external_exports.string().nullish()
});
var McpListResponseSchema = external_exports.object({ items: external_exports.array(external_exports.object({
  id: external_exports.string().min(1, "Server ID cannot be empty"),
  name: external_exports.string().min(1, "Server name cannot be empty"),
  createdAt: external_exports.string().optional(),
  updatedAt: external_exports.string().optional(),
  status: external_exports.string().optional()
})).optional() });
var ComposioMcpListResponseSchema = external_exports.object({ items: external_exports.array(external_exports.object({
  id: external_exports.string().min(1, "Server ID cannot be empty"),
  name: external_exports.string().min(1, "Server name cannot be empty"),
  created_at: external_exports.string().optional(),
  updated_at: external_exports.string().optional(),
  status: external_exports.string().optional()
})).optional() });
var McpRetrieveResponseSchema = external_exports.object({
  id: external_exports.string().min(1, "Server ID cannot be empty"),
  name: external_exports.string().min(1, "Server name cannot be empty"),
  createdAt: external_exports.string().optional(),
  updatedAt: external_exports.string().optional(),
  status: external_exports.string().optional(),
  toolkits: external_exports.array(external_exports.string()).optional(),
  tools: external_exports.array(external_exports.string()).optional(),
  managedAuthViaComposio: external_exports.boolean().optional(),
  authConfigIds: external_exports.array(external_exports.string()).optional(),
  mcpUrl: external_exports.string(),
  commands: external_exports.object({
    claude: external_exports.string(),
    cursor: external_exports.string(),
    windsurf: external_exports.string()
  })
});
var ComposioMcpRetrieveResponseSchema = external_exports.object({
  id: external_exports.string().min(1, "Server ID cannot be empty"),
  name: external_exports.string().min(1, "Server name cannot be empty"),
  created_at: external_exports.string().optional(),
  updated_at: external_exports.string().optional(),
  status: external_exports.string().optional(),
  toolkits: external_exports.array(external_exports.string()).optional(),
  tools: external_exports.array(external_exports.string()).optional(),
  managed_auth_via_composio: external_exports.boolean().optional()
});
var McpDeleteResponseSchema = external_exports.object({
  id: external_exports.string().min(1, "Server ID cannot be empty"),
  deleted: external_exports.boolean().optional(),
  message: external_exports.string().optional()
});
var ComposioMcpDeleteResponseSchema = external_exports.object({
  id: external_exports.string().min(1, "Server ID cannot be empty"),
  deleted: external_exports.boolean().optional(),
  message: external_exports.string().optional()
});
var McpUpdateResponseSchema = external_exports.object({
  id: external_exports.string().min(1, "Server ID cannot be empty"),
  name: external_exports.string().min(1, "Server name cannot be empty"),
  createdAt: external_exports.string().optional(),
  updatedAt: external_exports.string().optional(),
  status: external_exports.string().optional(),
  toolkits: external_exports.array(external_exports.string()).optional(),
  tools: external_exports.array(external_exports.string()).optional()
});
var ComposioMcpUpdateResponseSchema = external_exports.object({
  id: external_exports.string().min(1, "Server ID cannot be empty"),
  name: external_exports.string().min(1, "Server name cannot be empty"),
  created_at: external_exports.string().optional(),
  updated_at: external_exports.string().optional(),
  status: external_exports.string().optional(),
  toolkits: external_exports.array(external_exports.string()).optional(),
  tools: external_exports.array(external_exports.string()).optional()
});

export {
  constants_exports,
  logger_default,
  ComposioError$1,
  AuthConfigTypes,
  AuthSchemeTypes,
  AuthConfigCreationToolAccessConfigSchema,
  AuthConfigToolAccessConfigSchema,
  AuthSchemeEnum,
  CreateCustomAuthConfigParamsSchema,
  CreateComposioManagedAuthConfigParamsSchema,
  CreateAuthConfigParamsSchema,
  CreateAuthConfigResponseSchema,
  AuthConfigRetrieveResponseSchema,
  AuthConfigListParamsSchema,
  AuthConfigListResponseSchema,
  AuthCustomConfigUpdateParamsSchema,
  AuthDefaultConfigUpdateParamsSchema,
  AuthConfigUpdateParamsSchema,
  ConnectionStatuses,
  RedirectableAuthSchemeSchema,
  Oauth2InitiatingConnectionDataSchema,
  Oauth2InitiatedConnectionDataSchema,
  Oauth2ActiveConnectionDataSchema,
  Oauth2FailedConnectionDataSchema,
  Oauth2ExpiredConnectionDataSchema,
  Oauth2InactiveConnectionDataSchema,
  Oauth2ConnectionDataSchema,
  CustomOauth2ConnectionDataSchema,
  Oauth1InitiatingConnectionDataSchema,
  Oauth1InitiatedConnectionDataSchema,
  Oauth1ActiveConnectionDataSchema,
  Oauth1FailedConnectionDataSchema,
  Oauth1ExpiredConnectionDataSchema,
  Oauth1InactiveConnectionDataSchema,
  Oauth1ConnectionDataSchema,
  CustomOauth1ConnectionDataSchema,
  BillcomAuthConnectionDataSchema,
  ConnectionDataSchema,
  CustomConnectionDataSchema,
  ToolkitSchema,
  JSONSchemaPropertySchema,
  ToolSchema,
  ToolListResponseSchema,
  ToolkitLatestVersionSchema,
  ToolkitVersionSchema,
  ToolkitVersionsSchema,
  ToolkitVersionParamSchema,
  ToolListParamsSchema,
  CustomAuthParamsSchema,
  ToolExecuteParamsSchema,
  ToolExecuteMetaParamsSchema,
  ToolExecuteResponseSchema,
  ToolProxyParamsSchema,
  ConnectedAccountErrorCodes,
  ComposioConnectedAccountNotFoundError,
  ComposioMultipleConnectedAccountsError,
  ComposioFailedToCreateConnectedAccountLink,
  ToolErrorCodes,
  ComposioProviderNotDefinedError,
  ComposioToolNotFoundError,
  ComposioInvalidModifierError,
  ComposioCustomToolsNotInitializedError,
  ComposioToolExecutionError,
  ComposioInvalidExecuteFunctionError,
  ComposioGlobalExecuteToolFnNotSetError,
  ComposioToolVersionRequiredError,
  handleToolExecutionError,
  AuthConfigErrorCodes,
  ComposioAuthConfigNotFoundError,
  ConnectionRequestErrorCodes,
  ConnectionRequestTimeoutError,
  ConnectionRequestFailedError,
  ToolkitErrorCodes,
  ComposioToolkitNotFoundError,
  ComposioToolkitFetchError,
  ValidationErrorCodes,
  ValidationError,
  JsonSchemaToZodError,
  SDKErrorCodes,
  ComposioNoAPIKeyError,
  TriggerErrorCodes,
  ComposioFailedToGetSDKRealtimeCredentialsError,
  ComposioFailedToCreatePusherClientError,
  ComposioFailedToSubscribeToPusherChannelError,
  ComposioFailedToUnsubscribeFromPusherChannelError,
  ComposioTriggerTypeNotFoundError,
  ComposioWebhookSignatureVerificationError,
  ComposioWebhookPayloadError,
  ConnectedAccountStatuses,
  ConnectedAccountStatusSchema,
  CreateConnectedAccountParamsSchema,
  DefaultCreateConnectedAccountParamsSchema,
  CreateConnectedAccountOptionsSchema,
  CreateConnectedAccountResponseSchema,
  ConnectedAccountAuthConfigSchema,
  ConnectedAccountRetrieveResponseSchema,
  ConnectedAccountListParamsSchema,
  ConnectedAccountListResponseSchema,
  CreateConnectedAccountLinkOptionsSchema,
  CreateConnectedAccountLinkResponseSchema,
  ConnectedAccountRefreshOptionsSchema,
  ToolkitMangedByEnumSchema,
  ToolkitSortByEnumSchema,
  ToolkitsListParamsSchema,
  ToolKitMetaSchema,
  ToolKitItemSchema,
  ToolKitListResponseSchema,
  ToolkitAuthFieldSchema,
  ToolkitAuthConfigDetailsSchema,
  ToolkitRetrieveResponseSchema,
  ToolkitCategorySchema,
  ToolkitRetrieveCategoriesResponseSchema,
  ToolkitAuthFieldsResponseSchema,
  createConnectionRequest,
  TriggerStatuses,
  TriggerStatusEnum,
  TriggerSubscribeParamSchema,
  TriggerInstanceListActiveParamsSchema,
  TriggerInstanceListActiveResponseItemSchema,
  TriggerInstanceListActiveResponseSchema,
  TriggerInstanceUpsertParamsSchema,
  TriggerInstanceUpsertResponseSchema,
  TriggerInstanceManageUpdateParamsSchema,
  TriggerInstanceManageUpdateResponseSchema,
  TriggerInstanceManageDeleteResponseSchema,
  IncomingTriggerPayloadSchema,
  TriggersTypeListParamsSchema,
  TriggerTypeSchema,
  TriggersTypeListResponseSchema,
  WebhookPayloadV1Schema,
  WebhookPayloadV2Schema,
  WebhookPayloadV3Schema,
  WebhookTriggerPayloadV3Schema,
  WebhookPayloadSchema,
  WebhookVersions,
  VerifyWebhookParamsSchema,
  MCP,
  BaseNonAgenticProvider,
  BaseAgenticProvider,
  OpenAIProvider,
  MCPServerTypeSchema,
  ToolRouterConfigManageConnectionsSchema,
  ToolRouterToolkitsParamSchema,
  ToolRouterToolkitsDisabledConfigSchema,
  ToolRouterToolkitsEnabledConfigSchema,
  ToolRouterManageConnectionsConfigSchema,
  ToolRouterTagsParamSchema,
  ToolRouterTagsEnableDisableSchema,
  ToolRouterConfigTagsSchema,
  ToolRouterToolsParamSchema,
  ToolRouterConfigToolsSchema,
  ToolRouterCreateSessionConfigSchema,
  ToolkitConnectionStateSchema,
  ToolkitConnectionsDetailsSchema,
  ToolRouterMCPServerConfigSchema,
  ToolRouterToolkitsOptionsSchema,
  Composio2 as Composio,
  ComposioProvider,
  removeNonRequiredProperties,
  jsonSchemaToZodSchema,
  AuthScheme,
  WebhookEventTypes,
  WebhookConnectedAccountAuthConfigSchema,
  WebhookConnectionStateSchema,
  SingleConnectedAccountDetailedResponseSchema,
  WebhookConnectionMetadataSchema,
  ConnectionExpiredEventSchema,
  WebhookEventSchema,
  MCPToolkitConfigSchema,
  MCPToolkitConfigsArraySchema,
  MCPAuthOptionsSchema,
  MCPGetServerParamsSchema,
  MCPGenerateURLParamsSchema,
  ComposioGenerateURLParamsSchema,
  GenerateURLParamsSchema,
  GenerateURLResponseSchema,
  ComposioGenerateURLResponseSchema,
  MCPSingleAppServerSchema,
  MCPMultiAppServerSchema,
  MCPServerSchema,
  MCPServerListResponseSchema,
  MCPServerUpdateParamsSchema,
  MCPServerCreateResponseSchema,
  ConnectionStatus,
  CustomCreateResponseSchema,
  ComposioCustomCreateResponseSchema,
  McpListResponseSchema,
  ComposioMcpListResponseSchema,
  McpRetrieveResponseSchema,
  ComposioMcpRetrieveResponseSchema,
  McpDeleteResponseSchema,
  ComposioMcpDeleteResponseSchema,
  McpUpdateResponseSchema,
  ComposioMcpUpdateResponseSchema
};
//# sourceMappingURL=chunk-J4LCIBVK.mjs.map
