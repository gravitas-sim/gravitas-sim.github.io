/*
 * The reference code of Prompt 237: a planar N-body integrator, a fourth-order Hermite scheme with individual
 * block time steps (Aarseth; Makino 1991): steps are powers of two of a base interval, every body is predicted to
 * the time of the block and only the bodies whose step ends there are advanced. Direct summation. No Gravitas
 * code. The force on i from j is G m_j (x_j - x_i) / max(r, eps)^3, G = 1, the problem statement of
 * tests/fixtures/dynamics/thresholds.json; the jerk is its time derivative (outside eps the usual one, inside eps
 * m_j (v_j - v_i) / eps^3).
 *
 *   build:  cc -O3 -o hermite hermite.c -lm
 *   input (stdin, text):  N eps eta nOut interval
 *                         m x y vx vy            (N lines)
 *   The outputs are at k * interval for k = 0 ... nOut - 1 (interval the base time interval, a power-of-two
 *   fraction of it being the largest step: 1/1024 of it).
 *   output (stdout, binary): for each output time, N * 4 doubles: x, y, vx, vy of every body.
 *   stderr: block steps and force evaluations.
 *
 * The step of body i is eta times the smallest pair time scale it has,
 * min over j of min( (r_e^3 / (m_i + m_j))^(1/2), r_e / |v_ij| ) with r_e = max(r, eps): the free-fall time of the
 * closest pair and its crossing time. It is rounded down to a power of two of the interval, may at most double at
 * a step and only when the time is a multiple of the doubled step, so every body is exactly at every output time.
 * Time is an integer number of ticks (interval / 2^40), so no comparison of times is a comparison of floats.
 */
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

#define TICKBITS 40
#define MAXLEVEL 30 /* the largest step is 2^30 ticks = interval / 1024 */

static int n;
static double eps, eta, tick;
static double *m;

/* Acceleration and jerk on body i from the predicted state of all bodies, and its time scale. */
static double force_on(int i, const double *x, const double *y, const double *vx, const double *vy, double *ax,
                       double *ay, double *jx, double *jy) {
  const double e2 = eps * eps, e3 = eps * eps * eps;
  double sax = 0, say = 0, sjx = 0, sjy = 0, tau2 = 1e300;
  for (int k = 0; k < n; k++) {
    if (k == i) continue;
    double dx = x[k] - x[i], dy = y[k] - y[i];
    double dvx = vx[k] - vx[i], dvy = vy[k] - vy[i];
    double r2 = dx * dx + dy * dy, re2, re3, fx, fy, gx, gy;
    if (r2 >= e2) {
      double r = sqrt(r2), inv3 = 1.0 / (r2 * r), inv5 = inv3 / r2, rv = dx * dvx + dy * dvy;
      fx = dx * inv3;
      fy = dy * inv3;
      gx = dvx * inv3 - 3.0 * rv * dx * inv5;
      gy = dvy * inv3 - 3.0 * rv * dy * inv5;
      re2 = r2;
      re3 = r2 * r;
    } else {
      fx = dx / e3;
      fy = dy / e3;
      gx = dvx / e3;
      gy = dvy / e3;
      re2 = e2;
      re3 = e3;
    }
    sax += m[k] * fx;
    say += m[k] * fy;
    sjx += m[k] * gx;
    sjy += m[k] * gy;
    double v2 = dvx * dvx + dvy * dvy;
    double t1 = re3 / (m[i] + m[k]);
    double t2 = v2 > 0 ? re2 / v2 : 1e300;
    double t = t1 < t2 ? t1 : t2;
    if (t < tau2) tau2 = t;
  }
  *ax = sax;
  *ay = say;
  *jx = sjx;
  *jy = sjy;
  return tau2;
}

/* The largest power-of-two number of ticks not above want (at least 1, at most 2^MAXLEVEL). */
static int64_t quantise(double want_ticks) {
  int64_t d = 1;
  while (d < ((int64_t)1 << MAXLEVEL) && (double)(d * 2) <= want_ticks) d *= 2;
  return d;
}

int main(void) {
  int nout;
  double interval;
  if (scanf("%d %lf %lf %d %lf", &n, &eps, &eta, &nout, &interval) != 5) return 2;
  tick = interval / (double)((int64_t)1 << TICKBITS);
  m = malloc(sizeof(double) * n);
#define VEC(name) double *name = malloc(sizeof(double) * n)
  VEC(x); VEC(y); VEC(vx); VEC(vy); VEC(ax); VEC(ay); VEC(jx); VEC(jy); VEC(xp); VEC(yp); VEC(vxp); VEC(vyp); VEC(xc); VEC(yc); VEC(vxc); VEC(vyc);
  int64_t *ti = malloc(sizeof(int64_t) * n), *di = malloc(sizeof(int64_t) * n);
  int *act = malloc(sizeof(int) * n);
  for (int i = 0; i < n; i++)
    if (scanf("%lf %lf %lf %lf %lf", &m[i], &x[i], &y[i], &vx[i], &vy[i]) != 5) return 2;

  for (int i = 0; i < n; i++) {
    double tau2 = force_on(i, x, y, vx, vy, &ax[i], &ay[i], &jx[i], &jy[i]);
    ti[i] = 0;
    di[i] = quantise(eta * sqrt(tau2) / tick);
  }
  long blocks = 0, evals = 0;
  int64_t t = 0;
  const int64_t per_interval = (int64_t)1 << TICKBITS;
  for (int k = 0; k < nout; k++) {
    int64_t target = (int64_t)k * per_interval;
    while (t < target) {
      int64_t tn = INT64_MAX;
      for (int i = 0; i < n; i++)
        if (ti[i] + di[i] < tn) tn = ti[i] + di[i];
      t = tn;
      double ts = (double)t * tick;
      for (int j = 0; j < n; j++) {
        double h = (double)(t - ti[j]) * tick, h2 = h * h / 2, h3 = h * h * h / 6;
        xp[j] = x[j] + vx[j] * h + ax[j] * h2 + jx[j] * h3;
        yp[j] = y[j] + vy[j] * h + ay[j] * h2 + jy[j] * h3;
        vxp[j] = vx[j] + ax[j] * h + jx[j] * h2;
        vyp[j] = vy[j] + ay[j] * h + jy[j] * h2;
      }
      (void)ts;
      int na = 0;
      for (int i = 0; i < n; i++)
        if (ti[i] + di[i] == t) act[na++] = i;
      for (int q = 0; q < na; q++) {
        int i = act[q];
        double h = (double)(t - ti[i]) * tick;
        double anx, any, jnx, jny;
        double tau2 = force_on(i, xp, yp, vxp, vyp, &anx, &any, &jnx, &jny);
        double vxn = vx[i] + 0.5 * (ax[i] + anx) * h + (jx[i] - jnx) * h * h / 12.0;
        double vyn = vy[i] + 0.5 * (ay[i] + any) * h + (jy[i] - jny) * h * h / 12.0;
        double xn = x[i] + 0.5 * (vx[i] + vxn) * h + (ax[i] - anx) * h * h / 12.0;
        double yn = y[i] + 0.5 * (vy[i] + vyn) * h + (ay[i] - any) * h * h / 12.0;
        /* every force of this block is on the predicted state: the corrected states are kept aside */
        xc[i] = xn;
        yc[i] = yn;
        vxc[i] = vxn;
        vyc[i] = vyn;
        ax[i] = anx;
        ay[i] = any;
        jx[i] = jnx;
        jy[i] = jny;
        int64_t want = quantise(eta * sqrt(tau2) / tick), d = di[i];
        if (want >= 2 * d) {
          if (d < ((int64_t)1 << MAXLEVEL) && (t % (2 * d)) == 0) d *= 2;
        } else if (want < d) {
          d = want;
        }
        di[i] = d;
        evals++;
      }
      /* the active bodies take their corrected states; the others keep their old base state (predicted on demand) */
      for (int q = 0; q < na; q++) {
        int i = act[q];
        x[i] = xc[i];
        y[i] = yc[i];
        vx[i] = vxc[i];
        vy[i] = vyc[i];
        ti[i] = t;
      }
      blocks++;
    }
    for (int i = 0; i < n; i++) {
      double rec[4] = {x[i], y[i], vx[i], vy[i]};
      fwrite(rec, sizeof(double), 4, stdout);
    }
  }
  fprintf(stderr, "%ld %ld\n", blocks, evals);
  return 0;
}
