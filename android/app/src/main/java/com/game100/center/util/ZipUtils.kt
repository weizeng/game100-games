package com.game100.center.util

import java.io.File
import java.io.InputStream
import java.util.zip.ZipInputStream

object ZipUtils {
    /** 解压 zip 输入流到 destDir；防止 Zip Slip 路径穿越 */
    @Throws(Exception::class)
    fun unzip(input: InputStream, destDir: File) {
        destDir.mkdirs()
        val destCanonical = destDir.canonicalPath + File.separator
        ZipInputStream(input.buffered()).use { zis ->
            var entry = zis.nextEntry
            while (entry != null) {
                val outFile = File(destDir, entry.name)
                if (!outFile.canonicalPath.startsWith(destCanonical)) {
                    throw SecurityException("非法 zip 路径: ${entry.name}")
                }
                if (entry.isDirectory) {
                    outFile.mkdirs()
                } else {
                    outFile.parentFile?.mkdirs()
                    outFile.outputStream().use { out -> zis.copyTo(out) }
                }
                zis.closeEntry()
                entry = zis.nextEntry
            }
        }
    }
}
