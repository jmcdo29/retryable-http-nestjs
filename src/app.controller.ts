import { Controller, Get, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service';
import { Observable } from 'rxjs';

@Controller()
export class AppController {
  static callbackCalledTimes = 0;
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('fail')
  getHttpFail(): Observable<any> {
    return this.appService.getGoogleBad();
  }

  @Get('callback')
  getCallbackMessage(): string {
    console.log('request made to callback');
    if (AppController.callbackCalledTimes < 3) {
      AppController.callbackCalledTimes++;
      throw new BadRequestException();
    }
    AppController.callbackCalledTimes = 0;
    return 'callback called';
  }
}
