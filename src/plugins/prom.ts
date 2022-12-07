import { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import prom from "prom-client";
import { PromPluginOptions } from "../types/types";

const promPlugin: FastifyPluginCallback<PromPluginOptions> = (
  instance,
  opts,
  done
) => {
  // See prom-client library documentation for more details.
  const client = prom;
  const collectDefaultMetrics = client.collectDefaultMetrics;
  const appRegistry = new client.Registry();

  // Initialize default metric collection using app lifecycle hook
  instance.addHook("onReady", function (done) {
    if (opts.defaultMetrics) {
      collectDefaultMetrics(opts.defaultMetrics);
    } else {
      collectDefaultMetrics({ register: appRegistry });
    }
    done();
  });

  // Expose metrics endpoint for Prometheus to scrape
  instance.get("/metrics", async (req, reply) => {
    reply.header("Content-Type", appRegistry.contentType);
    return await appRegistry.metrics();
  });

  // Decorate instance with client and registry for creating custom metrics.
  instance.decorate("prom", client);
  instance.decorate("promRegister", appRegistry);

  done();
};

export default fp(promPlugin);
