plugins { id("com.android.application") }

val buildNumber = (project.findProperty("versionCode") as String?)?.toIntOrNull() ?: 1

android {
    namespace = "tech.grandddlc.lumen"
    compileSdk = 35
    defaultConfig {
        applicationId = "tech.grandddlc.lumen"
        minSdk = 26
        targetSdk = 34
        versionCode = buildNumber
        versionName = "1.0.$buildNumber"
    }
    signingConfigs {
        create("release") {
            // Supplied by CI (from repository secrets, or a throwaway key when none are set).
            storeFile = file(System.getenv("LUMEN_KEYSTORE") ?: "release.keystore")
            storePassword = System.getenv("LUMEN_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("LUMEN_KEY_ALIAS") ?: "lumen"
            keyPassword = System.getenv("LUMEN_KEYSTORE_PASSWORD")
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies { implementation("androidx.browser:browser:1.8.0") }
