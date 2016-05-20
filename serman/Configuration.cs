namespace serman
{
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public interface IConfiguration
    {
        /// <summary>
        /// Directory containing the services
        /// </summary>
        string ServiceRoot { get; }

        /// <summary>
        /// Path to the wrapper.exe
        /// </summary>
        string WrapperPath { get; }
    }

    public class Configuration : IConfiguration
    {
        public string ServiceRoot
        {
            get { return @"c:\serman\services"; }
        }

        public string WrapperPath
        {
            get { return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "winsw.exe"); }
        }
    }
}
