using System;
using System.Collections.Generic;

namespace FileUploadApi.Services
{
    public static class FileHelpers
    {
        private static readonly IDictionary<string, byte[]> _fileSignatures = new Dictionary<string, byte[]>
        {
            { ".jpg",  new byte[] { 0xFF, 0xD8, 0xFF } },
            { ".jpeg", new byte[] { 0xFF, 0xD8, 0xFF } },
            { ".png",  new byte[] { 0x89, 0x50, 0x4E, 0x47 } },
            { ".gif",  new byte[] { 0x47, 0x49, 0x46, 0x38 } },
            { ".pdf",  new byte[] { 0x25, 0x50, 0x44, 0x46 } }
        };

        public static bool IsValidHeader(byte[] headerBytes, string extension)
        {
            if (!_fileSignatures.TryGetValue(extension, out var signature))
                return false;

            if (headerBytes.Length < signature.Length)
                return false;

            for (int i = 0; i < signature.Length; i++)
            {
                if (headerBytes[i] != signature[i])
                    return false;
            }
            return true;
        }
    }
}
