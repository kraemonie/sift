package dev.sift.rank;
import android.webkit.WebView;
import android.view.ViewGroup;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.rule.ActivityTestRule;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.*;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class StudioTest {
 @Rule public ActivityTestRule<MainActivity> rule=new ActivityTestRule<>(MainActivity.class);
 private WebView web(){return (WebView)((ViewGroup)((ViewGroup)rule.getActivity().findViewById(android.R.id.content)).getChildAt(0)).getChildAt(0);}
 private String js(String code)throws Exception{AtomicReference<String> value=new AtomicReference<>();CountDownLatch latch=new CountDownLatch(1);InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web().evaluateJavascript(code,result->{value.set(result);latch.countDown();}));assertTrue("Javascript timeout",latch.await(10,TimeUnit.SECONDS));return value.get();}
 private void until(String expression)throws Exception{long end=System.currentTimeMillis()+45000;while(System.currentTimeMillis()<end){if("true".equals(js(expression)))return;Thread.sleep(150);}fail("Not ready: "+expression+" / "+js("document.getElementById('status').textContent"));}
 private void capture(String name)throws Exception{Thread.sleep(300);android.graphics.Bitmap image=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();try(java.io.FileOutputStream out=new java.io.FileOutputStream(new java.io.File(rule.getActivity().getExternalFilesDir(null),name))){image.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}image.recycle();try(android.os.ParcelFileDescriptor fd=InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand("cp "+new java.io.File(rule.getActivity().getExternalFilesDir(null),name).getAbsolutePath()+" /sdcard/Download/"+name);java.io.FileInputStream input=new java.io.FileInputStream(fd.getFileDescriptor())){while(input.read()!=-1){}}}
 @Test public void studioFlow()throws Exception{
  until("document.getElementById('statePill')&&document.getElementById('statePill').textContent==='Ready'");
  assertEquals("\"Sift · Low-rank studio\"",js("document.title"));
  assertEquals("true",js("document.documentElement.scrollWidth<=innerWidth+1"));
  assertEquals("true",js("document.querySelector('.brand').textContent.includes('sift')"));
  assertEquals("\"Select file\"",js("document.getElementById('openButton').textContent.trim()"));
  assertEquals("true",js("document.getElementById('openButton').getBoundingClientRect().height>=64"));
  assertEquals("true",js("document.getElementById('saveMedia').getBoundingClientRect().top>=document.getElementById('imageWorkspace').getBoundingClientRect().bottom-1"));
  for(int width:new int[]{320,360,412}){final int pixels=Math.round(width*rule.getActivity().getResources().getDisplayMetrics().density);InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{android.view.ViewGroup.LayoutParams lp=web().getLayoutParams();lp.width=pixels;web().setLayoutParams(lp);});Thread.sleep(300);assertEquals("Overflow at "+width,"true",js("document.documentElement.scrollWidth<=innerWidth+1"));}
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{android.view.ViewGroup.LayoutParams lp=web().getLayoutParams();lp.width=-1;web().setLayoutParams(lp);});
  js("document.getElementById('rankSlider').value=1;document.getElementById('rankSlider').dispatchEvent(new Event('input'))");
  until("document.getElementById('statePill').textContent==='Ready'&&document.getElementById('rankValue').textContent==='1'");
  assertEquals("true",js("document.getElementById('savingLabel').textContent.includes('smaller')"));
  js("document.querySelector('[data-preset=full]').click()");
  until("document.getElementById('statePill').textContent==='Ready'&&document.getElementById('rankValue').textContent===document.getElementById('maxRank').textContent");
  assertEquals("\"100.0%\"",js("document.getElementById('energyValue').textContent"));
  capture("sift-home.png");js("document.getElementById('imageWorkspace').scrollIntoView({block:'start'})");capture("sift-image.png");js("document.getElementById('helpButton').click()");assertEquals("true",js("!document.getElementById('mathPanel').hidden"));
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->rule.getActivity().onBackPressed());until("document.getElementById('mathPanel').hidden");
  js("document.getElementById('audioTab').click()");
  until("document.getElementById('statePill').textContent==='Ready'&&!document.getElementById('audioWorkspace').hidden");
  assertEquals("true",js("document.getElementById('resultAudio').src.startsWith('blob:')"));until("document.getElementById('previewPanel').dataset.transitioning!=='true'");assertEquals("true",js("document.getElementById('saveMedia').getBoundingClientRect().top>=document.getElementById('audioWorkspace').getBoundingClientRect().bottom-1"));js("document.getElementById('audioWorkspace').scrollIntoView({block:'start'})");capture("sift-audio.png");js("document.getElementById('saveMedia').scrollIntoView({block:'center'})");capture("sift-audio-download.png");
  assertEquals("true",js("document.documentElement.scrollWidth<=innerWidth+1"));
  assertEquals("true",js("(function(){var c=CompressorCore;var m=c.factorize([new Float32Array([1,2,2,4])],2,2);var b=c.pack(m,1,{kind:'image',width:2,height:2,name:'test'});return c.unpack(b).model.rank===1;})()"));
  js("document.getElementById('imageTab').click();document.getElementById('audioTab').click();document.getElementById('imageTab').click()");until("document.getElementById('statePill').textContent==='Ready'&&!document.getElementById('imageWorkspace').hidden");
 }
}
