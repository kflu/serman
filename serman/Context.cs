namespace serman
{
    using System.Collections.Generic;
    using System.IO;

    public class Context
    {
        public IConfiguration Config { get; set; }

        /// <summary>
        /// The ID of the service to be worked on
        /// </summary>
        public string ServiceId { get; internal set; }

        /// <summary>
        /// The path of the source service config file to be installed
        /// </summary>
        public string SourceServiceConfigPath { get; internal set; }

        /// <summary>
        /// The key-value pairs to be set in target service config file as env vars
        /// </summary>
        public IDictionary<string,string> Values { get; internal set; }
    }

    public static class ContextUtils
    {
        public static string GetServiceDirectory(this Context ctx)
        {
            return Path.Combine(ctx.Config.ServiceRoot, ctx.ServiceId);
        }

        public static string GetTargetServiceConfigPath(this Context ctx)
        {
            return Path.Combine(ctx.GetServiceDirectory(), $"{ctx.ServiceId}.xml");
        }

        public static string GetTargetWrapperPath(this Context ctx)
        {
            return Path.Combine(ctx.GetServiceDirectory(), $"{ctx.ServiceId}.exe");
        }

        public static string GetSourceServiceConfigDirectory(this Context ctx) =>
            Path.GetFullPath(Path.GetDirectoryName(ctx.SourceServiceConfigPath));
    }
}