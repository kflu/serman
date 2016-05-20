namespace Test
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;
    using Xunit;
    using serman;

    public class Tests
    {
        [Fact]
        void TestKeyValueParsing()
        {
            Assert.Equal(
                new Dictionary<string, string>
                {
                    ["k1"] = "v1",
                    ["k2"] = "v2",
                },
                Program.ParseCommandLineKeyValues(new[] { "k1=v1", "k2=v2" }));

            Assert.Equal(
                new Dictionary<string, string>
                {
                    ["k1"] = "v1=1",
                    ["k2"] = "",
                },
                Program.ParseCommandLineKeyValues(new[] { "k1=v1=1", "k2=" }));

            Assert.Equal(
                new Dictionary<string, string> { },
                Program.ParseCommandLineKeyValues((string[])null));
        }

        [Fact]
        void TestGetServiceId()
        {
            Assert.Equal("foo", Program.GetServiceId(@"c:\a\b\c\foo"));
            Assert.Equal("foo", Program.GetServiceId(@"c:\a\b\c\foo.bar"));
            Assert.Equal("foo", Program.GetServiceId("a/b/c/foo.bar"));
            Assert.Equal("foo", Program.GetServiceId("foo"));
        }

        [Fact]
        void TestGetPersistentVars()
        {
            string xml = Properties.Resources.config;
            var vars = Program.GetPersistentVars(xml);
            Func<string, string, KeyValuePair<string, string>> kvp = (k, v) => new KeyValuePair<string, string>(k, v);

            Assert.Equal(
                new List<KeyValuePair<string, string>>
                {
                    kvp("FOO", "BAR"),
                    kvp("FOO2", "BAR2"),
                },
                vars);
        }
    }
}
