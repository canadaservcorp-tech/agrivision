@file:Suppress("UnstableApiUsage")

import java.util.Properties

plugins {
    id("com.android.application")
    kotlin("android")
}

val localProperties = Properties().apply {
    val localPropertiesFile = rootProject.file("local.properties")
    if (localPropertiesFile.exists()) {
        localPropertiesFile.inputStream().use { load(it) }
    }
}

fun Project.configValue(name: String, default: String = ""): String {
    return localProperties.getProperty(name)
        ?: System.getenv(name)
        ?: default
}

android {
    namespace = "com.example.myfirstapp"
    compileSdk = 34
    defaultConfig {
        applicationId = "com.example.myfirstapp"
        minSdk = 23
        targetSdk = 34
        versionCode = 1
        versionName = "1.0-${System.getenv("VERSION_SHA")}"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "SQUARE_ENVIRONMENT", "\"${configValue("SQUARE_ENVIRONMENT", "sandbox")}\"")
        buildConfigField(
            "String",
            "SQUARE_SANDBOX_APPLICATION_ID",
            "\"${configValue("SQUARE_SANDBOX_APPLICATION_ID")}\"",
        )
        buildConfigField(
            "String",
            "SQUARE_PRODUCTION_APPLICATION_ID",
            "\"${configValue("SQUARE_APPLICATION_ID")}\"",
        )
        buildConfigField("String", "SQUARE_LOCATION_ID", "\"${configValue("SQUARE_LOCATION_ID")}\"")
    }
    buildFeatures {
        buildConfig = true
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.browser:browser:1.10.0-alpha02")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")

    testImplementation("org.junit.jupiter:junit-jupiter-api:5.9.3")
    androidTestImplementation("androidx.test:runner:1.5.2")
    androidTestImplementation("androidx.test.ext:junit-ktx:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}