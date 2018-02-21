"""Time series forecast for prediction PPO value."""


import pandas as pd
import numpy as np
from fbprophet import Prophet

df = pd.read_csv('./tmp/ppo.csv')

df['y'] = df['ppo_smoothed']
df['ds'] = df['date']

m = Prophet(interval_width=0.2, changepoint_prior_scale=0.01)
m.fit(df)

future = m.make_future_dataframe(periods=1, freq='H')

forecast = m.predict(future)

print("**")
print(forecast.yhat[len(forecast) - 1])