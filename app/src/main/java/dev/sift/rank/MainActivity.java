package dev.sift.rank;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.*;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import org.json.JSONObject;

public class MainActivity extends Activity {
 private WebView web;
 private ValueCallback<Uri[]> chooser;
 private byte[] exportBytes;
 private static final int OPEN=41,SAVE=42;
 private static final String PAGE="https://appassets.androidplatform.net/assets/index.html";
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(33,52,72));
  getWindow().setNavigationBarColor(Color.rgb(33,52,72));
  FrameLayout frame=new FrameLayout(this);
  frame.setBackgroundColor(Color.rgb(33,52,72));
  frame.setOnApplyWindowInsetsListener((view,insets)->{
   if(Build.VERSION.SDK_INT>=30){android.graphics.Insets safe=insets.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.displayCutout()|android.view.WindowInsets.Type.ime());view.setPadding(safe.left,safe.top,safe.right,safe.bottom);}
   return insets;
  });
  web=new WebView(this);frame.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(frame);
  web.setBackgroundColor(Color.rgb(234,224,207));
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setBlockNetworkLoads(true);
  WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
  WebViewAssetLoader assets=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){WebResourceResponse response=assets.shouldInterceptRequest(request.getUrl());return response!=null?response:new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,new ByteArrayInputStream(new byte[0]));}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !PAGE.equals(request.getUrl().toString());}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
    if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;
    Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
    try{startActivityForResult(intent,OPEN);}catch(Exception ex){chooser.onReceiveValue(null);chooser=null;notifySave(false,"File picker unavailable on this device.");}return true;
   }
  });
  web.addJavascriptInterface(new SaveBridge(),"SiftBridge");
  web.loadUrl(PAGE);
  if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::goBack);
 }
 private class SaveBridge {
  @JavascriptInterface public void saveFile(String name,String mime,String encoded){
   if(name==null||encoded==null||encoded.length()>12*1024*1024||!("image/png".equals(mime)||"audio/wav".equals(mime)||"application/octet-stream".equals(mime))){runOnUiThread(()->notifySave(false,"Invalid export. Try again."));return;}
   final byte[] data;
   try{data=Base64.decode(encoded,Base64.DEFAULT);}catch(IllegalArgumentException ex){runOnUiThread(()->notifySave(false,"Could not prepare export."));return;}
   String safeName=name.replaceAll("[^A-Za-z0-9._-]","_");
   runOnUiThread(()->{
    if(exportBytes!=null){notifySave(false,"An export is already open.");return;}
    if(!PAGE.equals(web.getUrl()))return;
    exportBytes=data;
    try{startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE,safeName),SAVE);}catch(Exception ex){exportBytes=null;notifySave(false,"Save picker unavailable on this device.");}
   });
  }
 }
 private void notifySave(boolean ok,String message){if(web!=null)web.evaluateJavascript("window.onNativeSaveResult&&window.onNativeSaveResult("+ok+","+JSONObject.quote(message)+")",null);}
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request==OPEN){if(chooser!=null){chooser.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);chooser=null;}}
  else if(request==SAVE){byte[] payload=exportBytes;exportBytes=null;if(result!=RESULT_OK||data==null||data.getData()==null||payload==null){notifySave(false,"Save cancelled. Your work is still here.");return;}
   Uri target=data.getData();new Thread(()->{try(OutputStream stream=getContentResolver().openOutputStream(target)){if(stream==null)throw new java.io.IOException();stream.write(payload);runOnUiThread(()->notifySave(true,"Saved successfully."));}catch(Exception ex){runOnUiThread(()->notifySave(false,"Could not save. Try another location."));}},"sift-export").start();
  }
 }
 private void goBack(){web.evaluateJavascript("(function(){if(window.handleSiftIntroBack&&window.handleSiftIntroBack())return true;var about=document.getElementById('aboutPanel');if(about&&!about.hidden){window.closeSiftAbout();return true;}var p=document.getElementById('mathPanel');if(p&&!p.hidden){window.closeMath();return true;}return false;})()",result->{if(!"true".equals(result))finish();});}
 @Override public void onBackPressed(){goBack();}
 @Override protected void onDestroy(){if(chooser!=null)chooser.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("SiftBridge");((FrameLayout)web.getParent()).removeView(web);web.destroy();web=null;}super.onDestroy();}
}
