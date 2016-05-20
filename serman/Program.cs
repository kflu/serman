namespace serman
{
    using CommandLine;
    using RunProcessAsTask;
    using System;
    using System.Collections.Generic;
    using System.Diagnostics;
    using System.IO;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;
    using System.Xml.Linq;

    [Verb("install", HelpText = "Install a service")]
    public class InstallOpts
    {
        [Value(0, MetaName = "config", HelpText = "The service configuration file to install")]
        public string Config { get; set; }

        [Value(1, MetaName = "KeyValues", HelpText = "The key value pairs (key=value) to be used to fill in the service configuration file template")]
        public string KeyValues { get; set; }
    }

    [Verb("uninstall", HelpText = "Uninstall a service")]
    class UninstallOpts
    {
        [Value(0, HelpText = "The service ID to uninstall")]
        public string Id { get; set; }
    }

    public static class Program
    {
        static void Main(string[] args)
        {
            Parser.Default.ParseArguments<InstallOpts, UninstallOpts>(args)
                .MapResult(
                    (InstallOpts opts) =>
                    {
                        new Context
                        {
                            Config = new Configuration(),
                            SourceServiceConfigPath = opts.Config,
                            Values = ParseCommandLineKeyValues(opts.KeyValues.Split(',')),
                            ServiceId = GetServiceId(opts.Config),
                        }
                        .DeployWrapper()
                        .DeployServiceConfig()
                        .RunWrapper("install")
                        .RunWrapper("start");

                        return 0;
                    },
                    (UninstallOpts opts) =>
                    {
                        new Context
                        {
                            Config = new Configuration(),
                            ServiceId = opts.Id,
                        }
                        .RunWrapper("uninstall");

                        return 0;
                    },
                    errs => 1);
        }

        internal static IDictionary<string, string> ParseCommandLineKeyValues(string[] kvs) =>
            (kvs ?? new string[0])
            .Select(kv => kv.Split(new[] { '=' }, 2))
            .ToDictionary(kv => kv[0], kv => kv[1]);

        internal static string GetServiceId(string configPath) => 
            Path.GetFileNameWithoutExtension(configPath);

        static Context DeployServiceConfig(this Context ctx)
        {
            EnsureDirectory(ctx.GetServiceDirectory());
            string xml = File.ReadAllText(ctx.SourceServiceConfigPath);

            // render xml
            xml = Nustache.Core.Render.StringToString(xml, ctx.Values);
            File.WriteAllText(ctx.GetTargetServiceConfigPath(), xml);

            // Persist env vars
            var vars = GetPersistentVars(xml);
            PersistEnv(vars);

            return ctx;
        }

        static Context DeployWrapper(this Context ctx)
        {
            EnsureDirectory(ctx.GetServiceDirectory());
            File.Copy(ctx.Config.WrapperPath, ctx.GetTargetWrapperPath());
            return ctx;
        }

        static Context RunWrapper(this Context ctx, string command)
        {
            Console.WriteLine($"Executing {ctx.GetTargetWrapperPath()} {command}...");
            using (var res = ProcessEx.RunAsync(ctx.GetTargetWrapperPath(), command).Result.Display()) { }
            return ctx;
        }

        private static void EnsureDirectory(string serviceDirectory)
        {
            Directory.CreateDirectory(serviceDirectory);
        }

        static ProcessResults Display(this ProcessResults res)
        {
            try
            {
                foreach (var l in res.StandardOutput)
                {
                    Console.WriteLine(l);
                }

                Console.ForegroundColor = ConsoleColor.Red;
                foreach (var l in res.StandardError)
                {
                    Console.WriteLine(l);
                }
            }
            finally
            {
                Console.ResetColor();
            }

            return res;
        }

        internal static List<KeyValuePair<string, string>> GetPersistentVars(string xml)
        {
            return XDocument.Parse(xml).Root
                .Descendants("persistent_env")
                .Select(e => new KeyValuePair<string, string>(
                    e.Attribute("name").Value,
                    e.Attribute("value").Value))
                .ToList();
        }

        static void PersistEnv(IEnumerable<KeyValuePair<string,string>> kvs)
        {
            // Persist env:
            kvs.ToList().ForEach(kv =>
            {
                Console.WriteLine($"Exporting environment variable {kv.Key}={kv.Value}...");
                using (ProcessEx.RunAsync("cmd.exe", $"/c SETX {kv.Key} {kv.Value} /M").Result.Display()) { }
            });
        }
    }
}
